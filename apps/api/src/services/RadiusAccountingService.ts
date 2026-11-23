import type { CustomerSession } from "../domain/entities/CustomerSession.ts";
import type { BaseRouterAdapter, RouterHealthMetrics } from "../infrastructure/routers/BaseRouterAdapter.ts";

export class RadiusAccountingService {
  public constructor(private readonly adapters: BaseRouterAdapter[]) {}

  public async getActiveSessions(): Promise<CustomerSession[]> {
    const results = await Promise.all(this.adapters.map((adapter) => adapter.getActiveSessions()));
    return results.flat();
  }

  public async getHealthMetrics(): Promise<RouterHealthMetrics[]> { return Promise.all(this.adapters.map((adapter) => adapter.getHealthMetrics())); }

  public async disconnectUser(mac: string): Promise<void> { const adapter = await this.forMac(mac); await adapter.disconnectUser(mac); }
  public async pauseUser(mac: string): Promise<void> { const adapter = await this.forMac(mac); await adapter.pauseUser(mac); }
  public async resumeUser(mac: string): Promise<void> { const adapter = await this.forMac(mac); await adapter.resumeUser(mac); }
  public async extendSession(mac: string, minutes: number): Promise<void> { const adapter = await this.forMac(mac); await adapter.extendSession(mac, minutes); }
  public async throttleUser(mac: string, rateLimitMbps: number): Promise<void> { const adapter = await this.forMac(mac); await adapter.throttleUser(mac, rateLimitMbps); }

  private async forMac(mac: string): Promise<BaseRouterAdapter> {
    const sessions = await Promise.all(this.adapters.map(async (adapter) => ({ adapter, sessions: await adapter.getActiveSessions() })));
    const match = sessions.find(({ sessions: candidates }) => candidates.some((session) => session.mac.toLowerCase() === mac.toLowerCase()));
    if (!match) throw new Error(`No active session found for MAC ${mac}.`);
    return match.adapter;
  }
}
