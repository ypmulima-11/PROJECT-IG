import { CustomerSession } from "../../domain/entities/CustomerSession.ts";
import { HotspotLocation } from "../../domain/entities/HotspotLocation.ts";
import { LedgerEntry } from "../../domain/entities/LedgerEntry.ts";
import { AirtelMoneyProvider, CashVoucherProvider, HaloPesaProvider, MpesaProvider, YasProvider } from "../payments/DemoPaymentProviders.ts";
import { DemoLedgerRepository } from "./DemoLedgerRepository.ts";
import { GenericRadiusAdapter } from "../routers/GenericRadiusAdapter.ts";
import { MikroTikAdapter } from "../routers/MikroTikAdapter.ts";
import { OpenWrtAdapter } from "../routers/OpenWrtAdapter.ts";
import { BillingService } from "../../services/BillingService.ts";
import { LedgerReconciliationService } from "../../services/LedgerReconciliationService.ts";
import { RadiusAccountingService } from "../../services/RadiusAccountingService.ts";

const DAR_OFFSET_MS = 3 * 60 * 60 * 1_000;
const todayAt = (hours: number, minutes: number): Date => {
  const darWallClock = new Date(Date.now() + DAR_OFFSET_MS);
  return new Date(Date.UTC(darWallClock.getUTCFullYear(), darWallClock.getUTCMonth(), darWallClock.getUTCDate(), hours, minutes) - DAR_OFFSET_MS);
};
const daysBefore = (days: number, hours: number, minutes: number): Date => {
  const value = todayAt(hours, minutes);
  value.setDate(value.getDate() - days);
  return value;
};
const minutesFromNow = (minutes: number): Date => new Date(Date.now() + minutes * 60_000);

const locations = [
  new HotspotLocation("rtr-kjt-01", "Kijitonyama-AP-01", "Kijitonyama, Dar es Salaam", "mikrotik", "MikroTik hAP ac²", true, new Date(Date.now() - 45_000)),
  new HotspotLocation("rtr-mik-02", "Mikocheni-AP-02", "Mikocheni, Dar es Salaam", "openwrt", "OpenWrt x86 Gateway", true, new Date(Date.now() - 72_000)),
  new HotspotLocation("rtr-sin-03", "Sinza-AP-03", "Sinza, Dar es Salaam", "generic-radius", "TP-Link Omada EAP", false, new Date(Date.now() - 3_600_000)),
];

const sessions = [
  new CustomerSession("ses-101", "rtr-kjt-01", "A4:5E:60:9A:17:C2", "10.10.1.24", "+255 754 830 217", "Kila Siku · 24 Hrs", todayAt(8, 24), minutesFromNow(165), 1830, 244, 642),
  new CustomerSession("ses-102", "rtr-kjt-01", "74:AC:B9:13:2F:80", "10.10.1.31", "VCH-KJT-04271", "Saa Mbili · 2 Hrs", todayAt(10, 48), minutesFromNow(28), 640, 91, 118),
  new CustomerSession("ses-103", "rtr-mik-02", "D8:3A:DD:27:81:4B", "10.20.0.16", "+255 713 448 090", "Wiki · 7 Days", todayAt(6, 12), new Date(Date.now() + 3 * 86_400_000), 2910, 360, 2140),
  new CustomerSession("ses-104", "rtr-mik-02", "10:62:E5:4B:92:1D", "10.20.0.29", "VCH-MIK-01108", "Kila Siku · 24 Hrs", todayAt(9, 7), minutesFromNow(18), 380, 54, 391),
];

const sales: LedgerEntry[] = [
  new LedgerEntry("led-01", todayAt(10, 42), "MPESA-7F9218", "+255 754 830 217", "Kila Siku · 24 Hrs", "mpesa", 1_000),
  new LedgerEntry("led-02", todayAt(10, 35), "VCH-KJT-04271", "Walk-in voucher", "Saa Mbili · 2 Hrs", "cash_voucher", 500),
  new LedgerEntry("led-03", todayAt(10, 21), "AIRTEL-019432", "+255 713 448 090", "Wiki · 7 Days", "airtel_money", 5_000),
  new LedgerEntry("led-04", todayAt(10, 3), "HALO-625194", "+255 687 202 516", "Kila Siku · 24 Hrs", "halopesa", 1_000),
  new LedgerEntry("led-05", todayAt(9, 54), "VCH-KJT-04268", "Walk-in voucher", "Saa Moja · 1 Hr", "cash_voucher", 300),
  new LedgerEntry("led-06", todayAt(9, 33), "YAS-114083", "+255 712 666 045", "Kila Siku · 24 Hrs", "yas", 1_000),
  new LedgerEntry("led-07", todayAt(9, 16), "MPESA-7F9182", "+255 655 871 402", "Saa Moja · 1 Hr", "mpesa", 300),
  new LedgerEntry("led-08", todayAt(8, 58), "VCH-MIK-01108", "Walk-in voucher", "Kila Siku · 24 Hrs", "cash_voucher", 1_000),
  new LedgerEntry("led-09", daysBefore(1, 18, 14), "MPESA-7F8A14", "+255 754 830 217", "Wiki · 7 Days", "mpesa", 5_000),
  new LedgerEntry("led-10", daysBefore(1, 17, 42), "VCH-KJT-04240", "Walk-in voucher", "Kila Siku · 24 Hrs", "cash_voucher", 1_000),
  new LedgerEntry("led-11", daysBefore(1, 16, 5), "VCH-KJT-04238", "Walk-in voucher", "Saa Moja · 1 Hr", "cash_voucher", 300),
  new LedgerEntry("led-12", daysBefore(1, 14, 26), "AIR-019380", "+255 687 202 516", "Kila Siku · 24 Hrs", "airtel_money", 1_000),
  new LedgerEntry("led-13", daysBefore(2, 19, 3), "MPESA-7F88D0", "+255 712 666 045", "Voucher batch · 20 codes", "mpesa", 10_000),
  new LedgerEntry("led-14", daysBefore(2, 18, 24), "HALO-624900", "+255 713 448 090", "Kila Siku · 24 Hrs", "halopesa", 1_000),
  new LedgerEntry("led-15", daysBefore(2, 17, 7), "VCH-KJT-04231", "Walk-in voucher", "Saa Mbili · 2 Hrs", "cash_voucher", 500),
  new LedgerEntry("led-16", daysBefore(3, 20, 11), "AIR-019201", "+255 713 448 090", "Wiki · 7 Days", "airtel_money", 5_000),
  new LedgerEntry("led-17", daysBefore(3, 18, 56), "MPESA-7F86F1", "+255 754 830 217", "Wiki · 7 Days", "mpesa", 5_000),
  new LedgerEntry("led-18", daysBefore(3, 18, 41), "YAS-113814", "+255 712 666 045", "Kila Siku · 24 Hrs", "yas", 1_000),
  new LedgerEntry("led-19", daysBefore(3, 16, 9), "VCH-KJT-04216", "Walk-in voucher", "Saa Moja · 1 Hr", "cash_voucher", 300),
  new LedgerEntry("led-20", daysBefore(4, 19, 30), "BATCH-KJT-019", "Kijitonyama reseller", "Voucher batch · 50 codes", "cash_voucher", 27_000),
  new LedgerEntry("led-21", daysBefore(4, 18, 5), "MPESA-7F8511", "+255 655 871 402", "Wiki · 7 Days", "mpesa", 5_000),
  new LedgerEntry("led-22", daysBefore(5, 18, 54), "MPESA-7F82A0", "+255 754 830 217", "Voucher batch · 20 codes", "mpesa", 10_000),
  new LedgerEntry("led-23", daysBefore(5, 17, 13), "AIR-018992", "+255 687 202 516", "Wiki · 7 Days", "airtel_money", 5_000),
  new LedgerEntry("led-24", daysBefore(5, 15, 48), "VCH-MIK-01084", "Walk-in voucher", "Kila Siku · 24 Hrs", "cash_voucher", 1_000),
  new LedgerEntry("led-25", daysBefore(6, 16, 32), "BATCH-MIK-008", "Mikocheni reseller", "Voucher batch · 50 codes", "cash_voucher", 30_000),
  new LedgerEntry("led-26", daysBefore(6, 15, 21), "VCH-MIK-01062", "Walk-in voucher", "Saa Moja · 1 Hr", "cash_voucher", 200),
  new LedgerEntry("led-27", daysBefore(8, 18, 32), "BATCH-KJT-014", "Kijitonyama reseller", "Voucher batch · 200 codes", "mpesa", 110_000),
  new LedgerEntry("led-28", daysBefore(12, 16, 48), "BATCH-MIK-006", "Mikocheni reseller", "Voucher batch · 200 codes", "airtel_money", 124_300),
  new LedgerEntry("led-29", daysBefore(18, 17, 10), "BATCH-KJT-009", "Kijitonyama reseller", "Voucher batch · 250 codes", "mpesa", 130_000),
];

const trafficByHour = [14, 9, 6, 5, 4, 8, 17, 29, 44, 58, 67, 55, 48, 53, 63, 72, 81, 77, 66, 58, 43, 34, 25, 19];

export class DemoSystem {
  public readonly accounting: RadiusAccountingService;
  public readonly reconciliation: LedgerReconciliationService;
  public readonly billing: BillingService;
  public readonly locations = locations;
  public readonly sessions = sessions;

  public constructor() {
    const adapters = [
      new MikroTikAdapter(locations[0]!, sessions.filter((session) => session.routerId === locations[0]!.id)),
      new OpenWrtAdapter(locations[1]!, sessions.filter((session) => session.routerId === locations[1]!.id)),
      new GenericRadiusAdapter(locations[2]!, sessions.filter((session) => session.routerId === locations[2]!.id)),
    ];
    this.accounting = new RadiusAccountingService(adapters);
    this.reconciliation = new LedgerReconciliationService(new DemoLedgerRepository(sales));
    this.billing = new BillingService([new MpesaProvider(), new AirtelMoneyProvider(), new HaloPesaProvider(), new YasProvider(), new CashVoucherProvider()], this.reconciliation);
  }

  public async getDashboardSnapshot() {
    const [routers, activeSessions] = await Promise.all([this.accounting.getHealthMetrics(), this.accounting.getActiveSessions()]);
    const entries = this.reconciliation.getEntries().sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    const darNow = new Date(Date.now() + DAR_OFFSET_MS);
    const todayStart = new Date(Date.UTC(darNow.getUTCFullYear(), darNow.getUTCMonth(), darNow.getUTCDate()) - DAR_OFFSET_MS);
    const todayEntries = entries.filter((entry) => entry.occurredAt >= todayStart);
    const weekStart = new Date(todayStart.getTime() - 6 * 86_400_000);
    const weekEntries = entries.filter((entry) => entry.occurredAt >= weekStart);
    const monthStart = new Date(Date.UTC(darNow.getUTCFullYear(), darNow.getUTCMonth(), 1) - DAR_OFFSET_MS);
    const monthEntries = entries.filter((entry) => entry.occurredAt >= monthStart);
    const sum = (rows: LedgerEntry[]) => rows.reduce((total, entry) => total + entry.amountTzs, 0);
    const byChannel = (rows: LedgerEntry[]) => ({ mobile: sum(rows.filter((entry) => entry.channel !== "cash_voucher")), cash: sum(rows.filter((entry) => entry.channel === "cash_voucher")) });
    const entriesWithBalance = [...entries].reverse().reduce<{ entry: LedgerEntry; balanceTzs: number }[]>((rows, entry) => {
      const balanceTzs = (rows.at(-1)?.balanceTzs ?? 0) + entry.amountTzs;
      rows.push({ entry, balanceTzs });
      return rows;
    }, []).reverse();
    return {
      summary: {
        todayTzs: sum(todayEntries), weekTzs: sum(weekEntries), monthTzs: sum(monthEntries),
        todayChannels: byChannel(todayEntries), weekChannels: byChannel(weekEntries), monthChannels: byChannel(monthEntries),
        activeDevices: activeSessions.filter((session) => session.state === "active").length,
        dataUsedMb: activeSessions.reduce((total, session) => total + session.dataUsedMb, 0),
        onlineRouters: routers.filter((router) => router.online).length, routerCount: routers.length,
      },
      entries: entriesWithBalance.map(({ entry, balanceTzs }) => ({
        id: entry.id, occurredAt: entry.occurredAt.toISOString(), reference: entry.reference, customerLabel: entry.customerLabel,
        packageName: entry.packageName, channel: entry.channel, amountTzs: entry.amountTzs, balanceTzs, verified: entry.verified,
      })),
      routers,
      sessions: activeSessions.map((session) => ({
        id: session.id, routerId: session.routerId, mac: session.mac, ipAddress: session.ipAddress, subscriber: session.subscriber,
        planName: session.planName, startedAt: session.startedAt.toISOString(), expiresAt: session.expiresAt.toISOString(),
        downloadKbps: session.downloadKbps, uploadKbps: session.uploadKbps, dataUsedMb: session.dataUsedMb,
        state: session.state, rateLimitMbps: session.rateLimitMbps,
      })),
      trafficByHour,
    };
  }

  public simulateTrafficTick(): void {
    for (const session of sessions) {
      if (session.state === "active") {
        const increment = 0.05 + Math.random() * 0.22;
        session.recordTraffic(increment);
        session.downloadKbps = Math.max(40, Math.round(session.downloadKbps + (Math.random() - 0.5) * 160));
        session.uploadKbps = Math.max(8, Math.round(session.uploadKbps + (Math.random() - 0.5) * 36));
      }
    }
  }
}
