export type PaymentChannel = "mpesa" | "airtel_money" | "halopesa" | "yas" | "cash_voucher";

export class LedgerEntry {
  public readonly verified = true;
  public constructor(
    public readonly id: string,
    public readonly occurredAt: Date,
    public readonly reference: string,
    public readonly customerLabel: string,
    public readonly packageName: string,
    public readonly channel: PaymentChannel,
    public readonly amountTzs: number,
  ) {
    if (!Number.isSafeInteger(amountTzs) || amountTzs <= 0) throw new Error("Ledger amount must be a positive whole TZS value.");
  }
}
