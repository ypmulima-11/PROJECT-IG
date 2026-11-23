import type { LedgerEntry } from "../../domain/entities/LedgerEntry.ts";
import type { LedgerRepository } from "../../domain/ports/LedgerRepository.ts";

export class DemoLedgerRepository implements LedgerRepository {
  public constructor(private readonly entries: LedgerEntry[]) {}
  public findByReference(reference: string): LedgerEntry | undefined { return this.entries.find((entry) => entry.reference === reference); }
  public save(entry: LedgerEntry): void { this.entries.unshift(entry); }
  public findAll(): LedgerEntry[] { return [...this.entries]; }
}
