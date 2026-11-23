export type RouterKind = "mikrotik" | "openwrt" | "generic-radius";

export class HotspotLocation {
  public constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly site: string,
    public readonly routerKind: RouterKind,
    public readonly model: string,
    public online: boolean,
    public readonly lastSeenAt: Date,
  ) {}
}
