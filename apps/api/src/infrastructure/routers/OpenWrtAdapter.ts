import { BaseRouterAdapter, type RouterHealthMetrics } from "./BaseRouterAdapter.ts";
import type { CustomerSession } from "../../domain/entities/CustomerSession.ts";
import type { HotspotLocation } from "../../domain/entities/HotspotLocation.ts";

export class OpenWrtAdapter extends BaseRouterAdapter {
  public constructor(location: HotspotLocation, sessions: CustomerSession[]) { super(location, sessions); }
  public async connect(): Promise<void> { this.location.online = true; }
  public async getActiveSessions(): Promise<CustomerSession[]> { return this.sessions.filter((session) => session.state === "active" || session.state === "paused"); }
  public async disconnectUser(mac: string): Promise<void> { this.findSession(mac).disconnect(); }
  public async pauseUser(mac: string): Promise<void> { this.findSession(mac).pause(); }
  public async resumeUser(mac: string): Promise<void> { this.findSession(mac).resume(); }
  public async extendSession(mac: string, minutes: number): Promise<void> { this.findSession(mac).extend(minutes); }
  public async throttleUser(mac: string, rateLimitMbps: number): Promise<void> { this.findSession(mac).throttle(rateLimitMbps); }
  public async getHealthMetrics(): Promise<RouterHealthMetrics> {
    return { routerId: this.location.id, name: this.location.name, online: this.location.online, model: this.location.model, connectedUsers: (await this.getActiveSessions()).length, lastSeenAt: this.location.lastSeenAt.toISOString() };
  }
}
