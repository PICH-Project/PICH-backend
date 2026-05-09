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
    this.logger.log(`Webhook received: ${payload.event}`);

    if (payload.event !== 'transaction.succeeded') {
      this.logger.log(`Ignoring event: ${payload.event}`);
      return;
    }

    const transactionData = payload.data;
    const customOrderId = transactionData?.customOrderId;

    if (!customOrderId) {
      this.logger.warn('Webhook received without customOrderId');
      return;
    }

    const parts = customOrderId.split('|');

    if (parts.length !== 3) {
      this.logger.error(`Invalid customOrderId format: ${customOrderId}`);
      return;
    }

    const [userId, planCodeStr, billingCycleStr] = parts;

    try {
      this.logger.log(
        `Processing payment for user ${userId}, plan ${planCodeStr}, cycle ${billingCycleStr}`,
      );

      const plan = await this.subscriptionsService.getPlanByCode(planCodeStr as PlanCode);

      const subscription = await this.subscriptionsService.activateSubscription({
        userId,
        planId: plan.id,
        paymentProvider: 'KIRAPAY',
        externalId: transactionData.hash || transactionData.id,
        amount: transactionData.amount,
        currency: transactionData.currency || 'USDG',
        billingCycle: billingCycleStr as BillingCycle,
      });

      this.logger.log(`Subscription ${planCodeStr} activated for user ${userId}`);
      const paymentTransaction = this.paymentTransactionsRepository.create({
        userId,
        subscriptionId: subscription.id,
        amount: transactionData.amount,
        currency: transactionData.currency || 'USDG',
        paymentProvider: 'KIRAPAY',
        providerTransactionId: transactionData.hash || transactionData.id,
        status: 'completed',
        metadata: {
          planCode: planCodeStr,
          billingCycle: billingCycleStr,
          transactionData: transactionData,
          processedAt: new Date().toISOString(),
        },
      });

      await this.paymentTransactionsRepository.save(paymentTransaction);
      this.logger.log(`Subscription ${planCodeStr} activated for user ${userId}`);
      this.logger.log(`Payment transaction ${paymentTransaction.id} recorded`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';

      this.logger.error(`Failed to activate subscription via webhook: ${errorMessage}`);
      try {
        const failedTransaction = this.paymentTransactionsRepository.create({
          userId,
          subscriptionId: null,
          amount: transactionData.amount,
          currency: transactionData.currency || 'USDG',
          paymentProvider: 'KIRAPAY',
          providerTransactionId: transactionData.hash || transactionData.id,
          status: 'failed',
          metadata: {
            error: errorMessage,
            transactionData: transactionData,
            failedAt: new Date().toISOString(),
          },
        });

        await this.paymentTransactionsRepository.save(failedTransaction);
        this.logger.log(`Failed transaction recorded: ${failedTransaction.id}`);
      } catch (saveError) {
        this.logger.error(`Failed to save error transaction: ${saveError}`);
      }
    }
  }
}
