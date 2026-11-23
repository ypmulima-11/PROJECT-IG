export class SubscriptionPlan {
  public constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly priceTzs: number,
    public readonly durationMinutes: number,
    public readonly dataCapGb: number | null,
    public readonly rateLimitMbps: number | null,
  ) {}
}
