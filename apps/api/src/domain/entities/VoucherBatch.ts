export class VoucherBatch {
  public constructor(
    public readonly id: string,
    public readonly batchCode: string,
    public readonly planId: string,
    public readonly quantity: number,
    public readonly createdAt: Date,
  ) {}
}
