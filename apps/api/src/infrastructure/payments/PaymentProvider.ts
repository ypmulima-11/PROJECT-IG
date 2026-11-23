import type { PaymentChannel } from "../../domain/entities/LedgerEntry.ts";

export interface PaymentRequest {
  amountTzs: number;
  reference: string;
  customerLabel: string;
  packageName: string;
}

export interface PaymentReceipt extends PaymentRequest {
  providerReference: string;
  channel: PaymentChannel;
  verified: boolean;
  occurredAt: Date;
}

export abstract class PaymentProvider {
  public abstract readonly channel: PaymentChannel;
  public abstract collectPayment(request: PaymentRequest): Promise<PaymentReceipt>;
}
