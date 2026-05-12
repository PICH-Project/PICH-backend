import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlanCode, BillingCycle } from '../subscriptions/subscriptions.enums';
import { PaymentTransaction } from './entities/playment-transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionsRepository: Repository<PaymentTransaction>,
  ) {}

  async generatePaymentLink(
    userId: string,
    planCode: PlanCode,
    billingCycle: BillingCycle,
  ): Promise<{ paymentUrl: string; orderId: string }> {
    const apiKey = this.configService.get<string>('KIRAPAY_API_KEY');

    const merchantAddress = this.configService.get<string>('MERCHANT_WALLET_ADDRESS');
    console.log('Address: ', merchantAddress);
    if (!apiKey || !merchantAddress) {
      throw new InternalServerErrorException('KiraPay API key or Merchant Address not configured');
    }
    const plan = await this.subscriptionsService.getPlanByCode(planCode);

    const price = billingCycle === BillingCycle.YEARLY ? plan.price * 12 : plan.price;
    console.log(price);

    const customOrderId = `${userId}|${planCode}|${billingCycle}`;

    this.logger.log(`Creating payment: ${customOrderId}, price: ${price}`);

    try {
      const response = await fetch('https://api.kira-pay.com/api/link/generate', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenOut: {
            chainId: 'sol',
            address: 'SOL',
          },
          // EVM USDC mainnet: { chainId: '8453', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
          // EVM USDC Sepolia: { chainId: '84532', address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' }
          // Solana USDC mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' — НЕ ПРАЦЮЄ,
          receiver: merchantAddress,
          originalPrice: Number(Number(price).toFixed(2)),
          fiatCurrency: 'USD',
          name: `PICH ${planCode} Subscription`,
          customOrderId: customOrderId,
          type: 'single_use',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`KiraPay rejected the payload. Details: ${errorBody}`);
        throw new Error(`KiraPay API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();

      if (!data.data?.url) {
        throw new Error('No URL returned from KiraPay');
      }

      this.logger.log(`Payment link created: ${data.data.url}`);

      return {
        paymentUrl: data.data.url,
        orderId: customOrderId,
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';

      // Для fetch errors справжня причина у error.cause (Node 18+ undici)
      this.logger.error(`KiraPay generation failed: ${errorMessage}`);
      if (error?.cause) {
        this.logger.error(`Cause: ${JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause))}`);
      }
      if (error?.stack) {
        this.logger.error(`Stack: ${error.stack}`);
      }
      throw new InternalServerErrorException('Failed to generate payment link. Please try again.');
    }
  }

  async processWebhook(payload: any): Promise<void> {
    // ─────────────────────────────────────────────────────────────────────
    //  KiraPay webhook — детальні логи для демо хакатона + дебагу.
    // ─────────────────────────────────────────────────────────────────────
    this.logger.log('═══════════════════════════════════════════════════');
    this.logger.log('         KIRAPAY WEBHOOK RECEIVED');
    this.logger.log('═══════════════════════════════════════════════════');
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    this.logger.log(`Raw payload keys: ${Object.keys(payload || {}).join(', ')}`);
    this.logger.log(`Full payload: ${JSON.stringify(payload, null, 2)}`);

    // KiraPay може шле подію у кількох форматах — парсимо універсально.
    const eventName = payload.event ?? payload.type ?? payload.eventType;
    const transactionData = payload.data ?? payload.transaction ?? payload;
    const txStatus: string | undefined = transactionData?.status;

    this.logger.log(`Event type: ${eventName ?? '(UNKNOWN)'}`);
    this.logger.log(`Tx status:  ${txStatus ?? '(no status field)'}`);

    // ═══ DEMO MODE (хакатон) ═══
    // Активуємо одразу на будь-який transaction-event (включно з .created/Pending).
    // Для прода треба чекати on-chain confirmation (status=Succeeded), але для
    // швидкого demo UX — даємо підписку як тільки KiraPay підтвердив що юзер
    // тиснув pay. Якщо транза потім failed — це окремий рідкісний кейс.
    //
    // Пропускаємо тільки явні провали.
    const isExplicitFailure =
      (txStatus &&
        ['failed', 'cancelled', 'canceled', 'rejected', 'error'].includes(
          txStatus.toLowerCase(),
        )) ||
      eventName === 'transaction.failed' ||
      eventName === 'payment.failed';

    if (isExplicitFailure) {
      this.logger.warn(
        `╳ Skipping FAILED transaction (event="${eventName}", status="${txStatus}")`,
      );
      this.logger.log('═══════════════════════════════════════════════════\n');
      return;
    }

    // Якщо event взагалі не про транзу (наприклад просто ping/health) —
    // ігноруємо. Транза має або recognized event name, або сам data блок
    // з полями customOrderId + amount/hash.
    const looksLikeTransaction =
      (eventName && /transaction|payment/i.test(eventName)) ||
      !!transactionData?.customOrderId;

    if (!looksLikeTransaction) {
      this.logger.warn(
        `╳ Skipping — doesn't look like a transaction event (event="${eventName}")`,
      );
      this.logger.log('═══════════════════════════════════════════════════\n');
      return;
    }


    // ─────────────────────────────────────────────────────────────────────
    //  Транзакція пройшла — детальний breakdown для демо.
    // ─────────────────────────────────────────────────────────────────────
    const customOrderId = transactionData?.customOrderId;
    const txHash = transactionData?.hash ?? transactionData?.txHash ?? transactionData?.id;
    const txAmount = transactionData?.amount ?? transactionData?.value;
    const txCurrency = transactionData?.currency ?? transactionData?.token ?? 'unknown';
    const txChain = transactionData?.chain ?? transactionData?.chainId ?? transactionData?.network;
    const sender = transactionData?.sender ?? transactionData?.from ?? transactionData?.payerAddress;
    const receiver = transactionData?.receiver ?? transactionData?.to ?? transactionData?.merchantAddress;
    const fiatAmount = transactionData?.fiatAmount ?? transactionData?.originalPrice;
    const fiatCurrency = transactionData?.fiatCurrency ?? 'USD';

    this.logger.log('───────────────────────────────────────────────────');
    this.logger.log('         TRANSACTION DETAILS');
    this.logger.log('───────────────────────────────────────────────────');
    this.logger.log(`Hash:        ${txHash ?? 'N/A'}`);
    this.logger.log(`Amount:      ${txAmount ?? 'N/A'} ${txCurrency}`);
    this.logger.log(`Fiat value:  ${fiatAmount ?? 'N/A'} ${fiatCurrency}`);
    this.logger.log(`Chain:       ${txChain ?? 'N/A'}`);
    this.logger.log(`Sender:      ${sender ?? 'N/A'}`);
    this.logger.log(`Receiver:    ${receiver ?? 'N/A'}`);

    // Solscan-лінка для зручної верифікації під час демо.
    if (txHash && (txChain === 'sol' || String(txChain).toLowerCase().includes('solana'))) {
      this.logger.log(`Solscan:     https://solscan.io/tx/${txHash}`);
    } else if (txHash && txChain) {
      this.logger.log(`Explorer:    (chain ${txChain}, hash ${txHash})`);
    }

    this.logger.log(`Custom order ID: ${customOrderId ?? 'N/A'}`);
    this.logger.log('───────────────────────────────────────────────────');

    if (!customOrderId) {
      this.logger.warn('╳ Webhook ignored — no customOrderId in payload');
      this.logger.log('═══════════════════════════════════════════════════\n');
      return;
    }

    const parts = customOrderId.split('|');

    if (parts.length !== 3) {
      this.logger.error(
        `╳ Invalid customOrderId format: "${customOrderId}" — expected "userId|planCode|billingCycle"`,
      );
      this.logger.log('═══════════════════════════════════════════════════\n');
      return;
    }

    const [userId, planCodeStr, billingCycleStr] = parts;

    this.logger.log(`User:        ${userId}`);
    this.logger.log(`Plan:        ${planCodeStr}`);
    this.logger.log(`Cycle:       ${billingCycleStr}`);
    this.logger.log('───────────────────────────────────────────────────');

    try {
      const plan = await this.subscriptionsService.getPlanByCode(planCodeStr as PlanCode);

      const subscription = await this.subscriptionsService.activateSubscription({
        userId,
        planId: plan.id,
        paymentProvider: 'KIRAPAY',
        externalId: txHash,
        amount: txAmount,
        currency: txCurrency,
        billingCycle: billingCycleStr as BillingCycle,
      });

      const paymentTransaction = this.paymentTransactionsRepository.create({
        userId,
        subscriptionId: subscription.id,
        amount: txAmount,
        currency: txCurrency,
        paymentProvider: 'KIRAPAY',
        providerTransactionId: txHash,
        status: 'completed',
        metadata: {
          planCode: planCodeStr,
          billingCycle: billingCycleStr,
          chain: txChain,
          sender,
          receiver,
          fiatAmount,
          fiatCurrency,
          transactionData,
          processedAt: new Date().toISOString(),
        },
      });

      await this.paymentTransactionsRepository.save(paymentTransaction);

      this.logger.log('         RESULT');
      this.logger.log('───────────────────────────────────────────────────');
      this.logger.log(`✓ Subscription ${planCodeStr} (${billingCycleStr}) ACTIVATED`);
      this.logger.log(`✓ Subscription ID:  ${subscription.id}`);
      this.logger.log(`✓ Expires at:       ${subscription.expiresAt?.toISOString?.() ?? 'N/A'}`);
      this.logger.log(`✓ Transaction row:  ${paymentTransaction.id}`);
      this.logger.log('═══════════════════════════════════════════════════\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';

      this.logger.error('───────────────────────────────────────────────────');
      this.logger.error('         ACTIVATION FAILED');
      this.logger.error('───────────────────────────────────────────────────');
      this.logger.error(`╳ Reason: ${errorMessage}`);

      try {
        const failedTransaction = this.paymentTransactionsRepository.create({
          userId,
          subscriptionId: null,
          amount: txAmount,
          currency: txCurrency,
          paymentProvider: 'KIRAPAY',
          providerTransactionId: txHash,
          status: 'failed',
          metadata: {
            error: errorMessage,
            planCode: planCodeStr,
            billingCycle: billingCycleStr,
            chain: txChain,
            sender,
            receiver,
            fiatAmount,
            fiatCurrency,
            transactionData,
            failedAt: new Date().toISOString(),
          },
        });

        await this.paymentTransactionsRepository.save(failedTransaction);
        this.logger.error(`Failed transaction row recorded: ${failedTransaction.id}`);
      } catch (saveError) {
        this.logger.error(`Failed to save error transaction: ${saveError}`);
      }
      this.logger.log('═══════════════════════════════════════════════════\n');
    }
  }
}
