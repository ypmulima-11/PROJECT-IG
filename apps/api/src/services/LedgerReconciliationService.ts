import { randomUUID } from "node:crypto";
import { LedgerEntry } from "../domain/entities/LedgerEntry.ts";
import type { LedgerRepository } from "../domain/ports/LedgerRepository.ts";
import type { PaymentReceipt } from "../infrastructure/payments/PaymentProvider.ts";

export class LedgerReconciliationService {
  public constructor(private readonly ledger: LedgerRepository) {}

  public recordVerifiedReceipt(receipt: PaymentReceipt): LedgerEntry {
    if (!receipt.verified) throw new Error("Unverified payment receipts cannot be recorded as revenue.");
    const existing = this.ledger.findByReference(receipt.providerReference);
    if (existing) return existing;
    const entry = new LedgerEntry(randomUUID(), receipt.occurredAt, receipt.providerReference, receipt.customerLabel, receipt.packageName, receipt.channel, receipt.amountTzs);
    this.ledger.save(entry);
    return entry;
  }

  public getEntries(): LedgerEntry[] { return this.ledger.findAll(); }
}
