import { IUmbraSigner } from '@umbra-privacy/sdk/interfaces';
import { Address, getTransactionEncoder } from '@solana/kit';

export class TransactionIntercepted extends Error {
  constructor(public readonly base64Transaction: string) {
    super('Transaction intercepted successfully');
    this.name = 'TransactionIntercepted';
  }
}

export class PrepareOnlySigner implements IUmbraSigner {
  public readonly address: Address;

  constructor(userAddress: string) {
    this.address = userAddress as Address;
  }

  async signTransaction(tx: any): Promise<any> {
    const encoder = getTransactionEncoder();
    const bytes = encoder.encode(tx);
    const base64Tx = Buffer.from(bytes).toString('base64');

    throw new Error(`INTERCEPTED_TX::${base64Tx}`);
  }

  async signTransactions(txs: readonly any[]): Promise<any[]> {
    throw new Error('Bulk signing not supported in prepare mode');
  }

  async signMessage(message: Uint8Array): Promise<any> {
    return new Uint8Array(64).fill(1);
  }
}
