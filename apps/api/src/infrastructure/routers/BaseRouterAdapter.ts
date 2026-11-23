import type { CustomerSession } from "../../domain/entities/CustomerSession.ts";
import type { HotspotLocation } from "../../domain/entities/HotspotLocation.ts";

export interface RouterHealthMetrics {
  routerId: string;
  name: string;
  online: boolean;
  model: string;
  connectedUsers: number;
  lastSeenAt: string;
}

export abstract class BaseRouterAdapter {
  protected constructor(
    public readonly location: HotspotLocation,
    protected readonly sessions: CustomerSession[],
  ) {}

  public abstract connect(): Promise<void>;
  public abstract getActiveSessions(): Promise<CustomerSession[]>;
  public abstract disconnectUser(mac: string): Promise<void>;
  public abstract pauseUser(mac: string): Promise<void>;
  public abstract resumeUser(mac: string): Promise<void>;
  public abstract extendSession(mac: string, minutes: number): Promise<void>;
  public abstract throttleUser(mac: string, rateLimitMbps: number): Promise<void>;
  public abstract getHealthMetrics(): Promise<RouterHealthMetrics>;

  protected findSession(mac: string): CustomerSession {
    const session = this.sessions.find((candidate) => candidate.mac.toLowerCase() === mac.toLowerCase());
    if (!session) throw new Error(`No session found for MAC ${mac}.`);
    return session;
  }
}
