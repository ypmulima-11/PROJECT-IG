import type { DashboardSnapshot, LedgerRow } from "./types";

const DAR_OFFSET_MS = 3 * 60 * 60 * 1_000;
const atToday = (hours: number, minutes: number) => {
  const darWallClock = new Date(Date.now() + DAR_OFFSET_MS);
  return new Date(Date.UTC(darWallClock.getUTCFullYear(), darWallClock.getUTCMonth(), darWallClock.getUTCDate(), hours, minutes) - DAR_OFFSET_MS).toISOString();
};
const atDaysBefore = (days: number, hours: number, minutes: number) => new Date(Date.parse(atToday(hours, minutes)) - days * 86_400_000).toISOString();
const expires = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const ledgerEntry = (id: string, days: number, hours: number, minutes: number, reference: string, customerLabel: string, packageName: string, channel: LedgerRow["channel"], amountTzs: number): Omit<LedgerRow, "balanceTzs"> => ({
  id, occurredAt: days === 0 ? atToday(hours, minutes) : atDaysBefore(days, hours, minutes), reference, customerLabel, packageName, channel, amountTzs, verified: true,
});

const chronologicalEntries: Omit<LedgerRow, "balanceTzs">[] = [
  ledgerEntry("led-01", 0, 10, 42, "MPESA-7F9218", "+255 754 830 217", "Kila Siku · 24 Hrs", "mpesa", 1_000),
  ledgerEntry("led-02", 0, 10, 35, "VCH-KJT-04271", "Walk-in voucher", "Saa Mbili · 2 Hrs", "cash_voucher", 500),
  ledgerEntry("led-03", 0, 10, 21, "AIRTEL-019432", "+255 713 448 090", "Wiki · 7 Days", "airtel_money", 5_000),
  ledgerEntry("led-04", 0, 10, 3, "HALO-625194", "+255 687 202 516", "Kila Siku · 24 Hrs", "halopesa", 1_000),
  ledgerEntry("led-05", 0, 9, 54, "VCH-KJT-04268", "Walk-in voucher", "Saa Moja · 1 Hr", "cash_voucher", 300),
  ledgerEntry("led-06", 0, 9, 33, "YAS-114083", "+255 712 666 045", "Kila Siku · 24 Hrs", "yas", 1_000),
  ledgerEntry("led-07", 0, 9, 16, "MPESA-7F9182", "+255 655 871 402", "Saa Moja · 1 Hr", "mpesa", 300),
  ledgerEntry("led-08", 0, 8, 58, "VCH-MIK-01108", "Walk-in voucher", "Kila Siku · 24 Hrs", "cash_voucher", 1_000),
  ledgerEntry("led-09", 1, 18, 14, "MPESA-7F8A14", "+255 754 830 217", "Wiki · 7 Days", "mpesa", 5_000),
  ledgerEntry("led-10", 1, 17, 42, "VCH-KJT-04240", "Walk-in voucher", "Kila Siku · 24 Hrs", "cash_voucher", 1_000),
  ledgerEntry("led-11", 1, 16, 5, "VCH-KJT-04238", "Walk-in voucher", "Saa Moja · 1 Hr", "cash_voucher", 300),
  ledgerEntry("led-12", 1, 14, 26, "AIR-019380", "+255 687 202 516", "Kila Siku · 24 Hrs", "airtel_money", 1_000),
  ledgerEntry("led-13", 2, 19, 3, "MPESA-7F88D0", "+255 712 666 045", "Voucher batch · 20 codes", "mpesa", 10_000),
  ledgerEntry("led-14", 2, 18, 24, "HALO-624900", "+255 713 448 090", "Kila Siku · 24 Hrs", "halopesa", 1_000),
  ledgerEntry("led-15", 2, 17, 7, "VCH-KJT-04231", "Walk-in voucher", "Saa Mbili · 2 Hrs", "cash_voucher", 500),
  ledgerEntry("led-16", 3, 20, 11, "AIR-019201", "+255 713 448 090", "Wiki · 7 Days", "airtel_money", 5_000),
  ledgerEntry("led-17", 3, 18, 56, "MPESA-7F86F1", "+255 754 830 217", "Wiki · 7 Days", "mpesa", 5_000),
  ledgerEntry("led-18", 3, 18, 41, "YAS-113814", "+255 712 666 045", "Kila Siku · 24 Hrs", "yas", 1_000),
  ledgerEntry("led-19", 3, 16, 9, "VCH-KJT-04216", "Walk-in voucher", "Saa Moja · 1 Hr", "cash_voucher", 300),
  ledgerEntry("led-20", 4, 19, 30, "BATCH-KJT-019", "Kijitonyama reseller", "Voucher batch · 50 codes", "cash_voucher", 27_000),
  ledgerEntry("led-21", 4, 18, 5, "MPESA-7F8511", "+255 655 871 402", "Wiki · 7 Days", "mpesa", 5_000),
  ledgerEntry("led-22", 5, 18, 54, "MPESA-7F82A0", "+255 754 830 217", "Voucher batch · 20 codes", "mpesa", 10_000),
  ledgerEntry("led-23", 5, 17, 13, "AIR-018992", "+255 687 202 516", "Wiki · 7 Days", "airtel_money", 5_000),
  ledgerEntry("led-24", 5, 15, 48, "VCH-MIK-01084", "Walk-in voucher", "Kila Siku · 24 Hrs", "cash_voucher", 1_000),
  ledgerEntry("led-25", 6, 16, 32, "BATCH-MIK-008", "Mikocheni reseller", "Voucher batch · 50 codes", "cash_voucher", 30_000),
  ledgerEntry("led-26", 6, 15, 21, "VCH-MIK-01062", "Walk-in voucher", "Saa Moja · 1 Hr", "cash_voucher", 200),
  ledgerEntry("led-27", 8, 18, 32, "BATCH-KJT-014", "Kijitonyama reseller", "Voucher batch · 200 codes", "mpesa", 110_000),
  ledgerEntry("led-28", 12, 16, 48, "BATCH-MIK-006", "Mikocheni reseller", "Voucher batch · 200 codes", "airtel_money", 124_300),
  ledgerEntry("led-29", 18, 17, 10, "BATCH-KJT-009", "Kijitonyama reseller", "Voucher batch · 250 codes", "mpesa", 130_000),
].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));

let runningBalance = 0;
const ledgerEntries: LedgerRow[] = chronologicalEntries.map((entry) => {
  runningBalance += entry.amountTzs;
  return { ...entry, balanceTzs: runningBalance };
}).reverse();

export const demoSnapshot: DashboardSnapshot = {
  summary: { todayTzs: 10_100, weekTzs: 118_400, monthTzs: 482_700, todayChannels: { mobile: 8_300, cash: 1_800 }, weekChannels: { mobile: 56_300, cash: 62_100 }, monthChannels: { mobile: 420_600, cash: 62_100 }, activeDevices: 4, dataUsedMb: 3_291, onlineRouters: 2, routerCount: 3 },
  entries: ledgerEntries,
  routers: [
    { routerId: "rtr-kjt-01", name: "Kijitonyama-AP-01", online: true, model: "MikroTik hAP ac²", connectedUsers: 2, lastSeenAt: new Date(Date.now() - 45_000).toISOString() },
    { routerId: "rtr-mik-02", name: "Mikocheni-AP-02", online: true, model: "OpenWrt x86 Gateway", connectedUsers: 2, lastSeenAt: new Date(Date.now() - 72_000).toISOString() },
    { routerId: "rtr-sin-03", name: "Sinza-AP-03", online: false, model: "TP-Link Omada EAP", connectedUsers: 0, lastSeenAt: new Date(Date.now() - 3_600_000).toISOString() },
  ],
  sessions: [
    { id: "ses-101", routerId: "rtr-kjt-01", mac: "A4:5E:60:9A:17:C2", ipAddress: "10.10.1.24", subscriber: "+255 754 830 217", planName: "Kila Siku · 24 Hrs", startedAt: atToday(8, 24), expiresAt: expires(165), downloadKbps: 1830, uploadKbps: 244, dataUsedMb: 642, state: "active", rateLimitMbps: null },
    { id: "ses-102", routerId: "rtr-kjt-01", mac: "74:AC:B9:13:2F:80", ipAddress: "10.10.1.31", subscriber: "VCH-KJT-04271", planName: "Saa Mbili · 2 Hrs", startedAt: atToday(10, 48), expiresAt: expires(28), downloadKbps: 640, uploadKbps: 91, dataUsedMb: 118, state: "active", rateLimitMbps: null },
    { id: "ses-103", routerId: "rtr-mik-02", mac: "D8:3A:DD:27:81:4B", ipAddress: "10.20.0.16", subscriber: "+255 713 448 090", planName: "Wiki · 7 Days", startedAt: atToday(6, 12), expiresAt: expires(3_600), downloadKbps: 2910, uploadKbps: 360, dataUsedMb: 2140, state: "active", rateLimitMbps: null },
    { id: "ses-104", routerId: "rtr-mik-02", mac: "10:62:E5:4B:92:1D", ipAddress: "10.20.0.29", subscriber: "VCH-MIK-01108", planName: "Kila Siku · 24 Hrs", startedAt: atToday(9, 7), expiresAt: expires(18), downloadKbps: 380, uploadKbps: 54, dataUsedMb: 391, state: "active", rateLimitMbps: null },
  ],
  trafficByHour: [14, 9, 6, 5, 4, 8, 17, 29, 44, 58, 67, 55, 48, 53, 63, 72, 81, 77, 66, 58, 43, 34, 25, 19],
};
