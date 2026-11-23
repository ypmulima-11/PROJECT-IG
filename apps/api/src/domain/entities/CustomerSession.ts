export type SessionState = "active" | "paused" | "disconnected" | "expired";

export class CustomerSession {
  public state: SessionState = "active";
  public rateLimitMbps: number | null = null;
  public expiresAt: Date;
  public dataUsedMb: number;

  public constructor(
    public readonly id: string,
    public readonly routerId: string,
    public readonly mac: string,
    public readonly ipAddress: string,
    public readonly subscriber: string,
    public readonly planName: string,
    public readonly startedAt: Date,
    expiresAt: Date,
    public downloadKbps: number,
    public uploadKbps: number,
    dataUsedMb: number,
  ) {
    this.expiresAt = expiresAt;
    this.dataUsedMb = dataUsedMb;
  }

  public disconnect(): void { this.state = "disconnected"; this.downloadKbps = 0; this.uploadKbps = 0; }
  public pause(): void { if (this.state === "active") { this.state = "paused"; this.downloadKbps = 0; this.uploadKbps = 0; } }
  public resume(): void { if (this.state === "paused") this.state = "active"; }
  public extend(minutes: number): void { this.expiresAt = new Date(Math.max(this.expiresAt.getTime(), Date.now()) + minutes * 60_000); }
  public throttle(rateLimitMbps: number): void { this.rateLimitMbps = rateLimitMbps; this.downloadKbps = Math.min(this.downloadKbps, rateLimitMbps * 1_000); }
  public recordTraffic(downloadedMb: number): void { if (this.state === "active") this.dataUsedMb += downloadedMb; }
}
