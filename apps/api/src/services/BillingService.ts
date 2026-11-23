import { randomUUID } from "node:crypto";
import type { PaymentChannel } from "../domain/entities/LedgerEntry.ts";
import type { PaymentProvider, PaymentRequest } from "../infrastructure/payments/PaymentProvider.ts";
import { LedgerReconciliationService } from "./LedgerReconciliationService.ts";

export class BillingService {
  private readonly providers = new Map<PaymentChannel, PaymentProvider>();

  public constructor(providers: PaymentProvider[], private readonly reconciliation: LedgerReconciliationService) {
    for (const provider of providers) this.providers.set(provider.channel, provider);
  }

  public async collect(channel: PaymentChannel, request: PaymentRequest) {
    const provider = this.providers.get(channel);
    if (!provider) throw new Error(`Payment channel ${channel} is not configured.`);
    const receipt = await provider.collectPayment({ ...request, reference: request.reference || `DEMO-${randomUUID()}` });
    return this.reconciliation.recordVerifiedReceipt(receipt);
  }
}
