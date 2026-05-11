import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getUmbraClient,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
} from '@umbra-privacy/sdk';
import { address as createAddress } from '@solana/kit';
import type { U64 } from '@umbra-privacy/sdk/types';
import { PrepareOnlySigner, TransactionIntercepted } from './prepare-signer';

@Injectable()
export class UmbraService {
  private readonly logger = new Logger(UmbraService.name);
  private readonly WSOL_MINT = 'So11111111111111111111111111111111111111112';

  constructor(private configService: ConfigService) {}

  async prepareP2PDonation(params: {
    senderAddress: string;
    recipientAddress: string;
    amount: bigint;
  }): Promise<{ success: boolean; transactionBase64: string }> {
    try {
      this.logger.log(`Building unsigned tx for ${params.senderAddress}`);

      const mockSigner = new PrepareOnlySigner(params.senderAddress);

      const client = await getUmbraClient(
        {
          signer: mockSigner,
          network: 'devnet',
          rpcUrl: this.configService.get('SOLANA_RPC_URL') || 'https://api.devnet.solana.com',
          rpcSubscriptionsUrl:
            this.configService.get('SOLANA_RPC_WS_URL') || 'wss://api.devnet.solana.com',
          deferMasterSeedSignature: true,
        },
        {
          masterSeedStorage: {
            generate: async () => new Uint8Array(64).fill(1) as any,
            load: async () => ({ exists: true, seed: new Uint8Array(64).fill(1) }) as any,
            store: async () => ({}) as any,
          },
        },
      );

      const recipientAddr = createAddress(params.recipientAddress);
      const mintAddr = createAddress(this.WSOL_MINT);
      const amountU64 = params.amount as unknown as U64;

      const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });

      this.logger.log('Executing deposit (expecting interception)...');

      await deposit(recipientAddr, mintAddr, amountU64);
      throw new Error('SDK failed to intercept the transaction!');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);

      if (errorMsg.includes('INTERCEPTED_TX::')) {
        const base64Tx = errorMsg.split('INTERCEPTED_TX::')[1].split('\n')[0].trim();

        this.logger.log('Transaction successfully intercepted and extracted!');
        return {
          success: true,
          transactionBase64: base64Tx,
        };
      }

      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Build failed: ${msg}`);
      throw error;
    }
  }
}
