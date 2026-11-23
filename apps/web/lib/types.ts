export type Channel = "mpesa" | "airtel_money" | "halopesa" | "yas" | "cash_voucher";

export interface LedgerRow {
  id: string;
  occurredAt: string;
  reference: string;
  customerLabel: string;
  packageName: string;
  channel: Channel;
  amountTzs: number;
  balanceTzs: number;
  verified: boolean;
}

export interface RouterRow {
  routerId: string;
  name: string;
  online: boolean;
  model: string;
  connectedUsers: number;
  lastSeenAt: string;
}

export interface SessionRow {
  id: string;
  routerId: string;
  mac: string;
  ipAddress: string;
  subscriber: string;
  planName: string;
  startedAt: string;
  expiresAt: string;
  downloadKbps: number;
  uploadKbps: number;
  dataUsedMb: number;
  state: "active" | "paused" | "disconnected" | "expired";
  rateLimitMbps: number | null;
}

export interface DashboardSnapshot {
  summary: {
    todayTzs: number;
    weekTzs: number;
    monthTzs: number;
    todayChannels: { mobile: number; cash: number };
    weekChannels: { mobile: number; cash: number };
    monthChannels: { mobile: number; cash: number };
    activeDevices: number;
    dataUsedMb: number;
    onlineRouters: number;
    routerCount: number;
  };
  entries: LedgerRow[];
  routers: RouterRow[];
  sessions: SessionRow[];
  trafficByHour: number[];
}
