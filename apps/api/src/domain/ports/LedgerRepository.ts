import type { LedgerEntry } from "../entities/LedgerEntry.ts";

export interface LedgerRepository {
  findByReference(reference: string): LedgerEntry | undefined;
  save(entry: LedgerEntry): void;
  findAll(): LedgerEntry[];
}
