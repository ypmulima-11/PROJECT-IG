"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { DashboardSnapshot, LedgerRow, SessionRow } from "@/lib/types";

export type WorkspaceView = "Sales ledger" | "Connected users" | "Vouchers & plans" | "Traffic reports" | "Setup guide" | "Settings";
type SessionAction = "disconnect" | "pause" | "resume" | "extend";

const channels: Record<LedgerRow["channel"], string> = { mpesa: "M-Pesa", airtel_money: "Airtel Money", halopesa: "HaloPesa", yas: "Yas", cash_voucher: "Cash voucher" };
const formatMoney = (value: number) => new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(value);
const formatData = (mb: number) => mb >= 1_000 ? `${(mb / 1_000).toFixed(2)} GB` : `${Math.round(mb)} MB`;
const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const elapsed = (value: string, referenceTime = Date.now()) => {
  const minutes = Math.max(0, Math.floor((referenceTime - Date.parse(value)) / 60_000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
const sessionRemaining = (value: string, referenceTime = Date.now()) => {
  const minutes = Math.ceil((Date.parse(value) - referenceTime) / 60_000);
  if (minutes <= 0) return "Expired";
  return minutes < 60 ? `${minutes}m left` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

interface WorkspaceViewsProps {
  view: WorkspaceView;
  snapshot: DashboardSnapshot;
  query: string;
  onQueryChange: (value: string) => void;
  onExport: (entries?: LedgerRow[]) => void;
  onSessionAction: (session: SessionRow, action: SessionAction) => void;
  busyMac: string | null;
  socketLive: boolean;
  lastUpdated: Date;
  onNavigate: (view: "Setup guide" | "Settings") => void;
}

export function WorkspaceViews(props: WorkspaceViewsProps) {
  switch (props.view) {
    case "Sales ledger": return <SalesLedger {...props} />;
    case "Connected users": return <ConnectedUsers {...props} />;
    case "Vouchers & plans": return <VouchersAndPlans />;
    case "Traffic reports": return <TrafficReports snapshot={props.snapshot} />;
    case "Setup guide": return <SetupGuide />;
    case "Settings": return <SettingsView {...props} />;
  }
}

function SalesLedger({ snapshot, query, onQueryChange, onExport }: WorkspaceViewsProps) {
  const [channel, setChannel] = useState("all");
  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return snapshot.entries.filter((row) => {
      const matchesSearch = !search || `${row.reference} ${row.customerLabel} ${row.packageName} ${channels[row.channel]}`.toLowerCase().includes(search);
      return matchesSearch && (channel === "all" || row.channel === channel);
    });
  }, [channel, query, snapshot.entries]);
  const visibleTotal = rows.reduce((sum, row) => sum + row.amountTzs, 0);
  return <div className="workspace-view">
    <section className="workspace-stats" aria-label="Ledger totals">
      <Stat label="TRANSACTIONS SHOWN" value={String(rows.length)} note="Across recorded dates" />
      <Stat label="VISIBLE SALES" value={`TZS ${formatMoney(visibleTotal)}`} note="Sum of filtered entries" />
      <Stat label="PAYMENT CHANNELS" value={String(new Set(rows.map((row) => row.channel)).size)} note="Mobile money and cash" />
    </section>
    <section className="panel ledger-panel workspace-panel">
      <div className="panel-heading ledger-heading"><div><div className="panel-title-row"><h2>All sales</h2><span className="entry-count">{rows.length} entries</span></div><p>Chronological sales record · Tanzania shillings</p></div>
        <div className="table-tools"><div className="search-field"><span className="search-symbol">⌕</span><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search reference, customer or plan" aria-label="Search sales ledger"/><button type="button" className="clear-search" onClick={() => onQueryChange("")} aria-label="Clear search">×</button></div><button className="square-tool" onClick={() => onExport(rows)} aria-label="Export filtered ledger">⇩</button></div>
      </div>
      <div className="filter-row"><label>Payment channel <select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="all">All channels</option>{Object.entries(channels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><span>Newest records first</span></div>
      <div className="table-scroll"><table className="ledger-table workspace-ledger-table"><thead><tr><th>DATE / TIME</th><th>REFERENCE</th><th>CUSTOMER / VOUCHER</th><th>PACKAGE</th><th>CHANNEL</th><th className="amount-col">AMOUNT</th><th className="balance-col">BALANCE</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="time-cell">{formatDate(row.occurredAt)}</td><td><span className="reference-code">{row.reference}</span></td><td className="customer-cell">{row.customerLabel}</td><td className="package-cell">{row.packageName}</td><td><span className={`channel-tag channel-${row.channel}`}><span className="channel-initial">{row.channel === "cash_voucher" ? "T" : channels[row.channel].slice(0, 1)}</span>{channels[row.channel]}</span></td><td className="amount-cell">{formatMoney(row.amountTzs)} <small>TZS</small></td><td className="balance-cell">{formatMoney(row.balanceTzs)}</td></tr>)}</tbody></table>
        {rows.length === 0 && <div className="empty-state"><strong>No sales match those filters</strong><span>Clear the search or choose another payment channel.</span></div>}
      </div>
      <div className="table-footer"><span>Showing <b>{rows.length}</b> of <b>{snapshot.entries.length}</b> transactions</span><button className="view-all" onClick={() => onExport(rows)}>Download CSV</button></div>
    </section>
    <div className="workspace-note"><span className="note-dot"/> Ledger is read from the current dashboard data source. Export includes the matching search and channel results.</div>
  </div>;
}

function ConnectedUsers({ snapshot, onSessionAction, busyMac, lastUpdated }: WorkspaceViewsProps) {
  const [search, setSearch] = useState("");
  const [routerId, setRouterId] = useState("all");
  const now = lastUpdated.getTime();
  const sessions = snapshot.sessions.filter((session) => {
    const matchesSearch = !search || `${session.subscriber} ${session.mac} ${session.ipAddress} ${session.planName}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (routerId === "all" || session.routerId === routerId);
  });
  const activeCount = snapshot.sessions.filter((session) => session.state === "active").length;
  const pausedCount = snapshot.sessions.filter((session) => session.state === "paused").length;
  const aggregateData = snapshot.sessions.reduce((sum, session) => sum + session.dataUsedMb, 0);
  return <div className="workspace-view">
    <section className="workspace-stats" aria-label="Session totals">
      <Stat label="ACTIVE SESSIONS" value={String(activeCount).padStart(2, "0")} note="Currently authenticated" tone="green" />
      <Stat label="PAUSED SESSIONS" value={String(pausedCount).padStart(2, "0")} note="Can be resumed" />
      <Stat label="DATA USED" value={formatData(aggregateData)} note="Across listed sessions" />
    </section>
    <section className="panel workspace-panel">
      <div className="panel-heading sessions-heading workspace-sessions-heading"><div><div className="panel-title-row"><h2>Live sessions</h2><span className="live-count"><i/> {activeCount} active</span></div><p>Inspect a device and manage its current access session.</p></div>
        <div className="session-filters"><div className="search-field"><span className="search-symbol">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users or devices" aria-label="Search connected users"/><button type="button" className="clear-search" onClick={() => setSearch("")} aria-label="Clear search">×</button></div><select value={routerId} onChange={(event) => setRouterId(event.target.value)} aria-label="Filter by router"><option value="all">All routers</option>{snapshot.routers.map((router) => <option key={router.routerId} value={router.routerId}>{router.name}</option>)}</select></div>
      </div>
      <div className="table-scroll"><table className="sessions-table workspace-sessions-table"><thead><tr><th>DEVICE / SUBSCRIBER</th><th>ROUTER</th><th>UPTIME</th><th>LIVE RATE ↓ / ↑</th><th>DATA USED</th><th>SESSION</th><th>ACTIONS</th></tr></thead><tbody>{sessions.map((session) => <SessionRow key={session.id} session={session} routerName={snapshot.routers.find((router) => router.routerId === session.routerId)?.name ?? "Unknown router"} busy={busyMac === session.mac} now={now} onAction={onSessionAction}/>)}</tbody></table>
        {sessions.length === 0 && <div className="empty-state"><strong>No connected users found</strong><span>Try a different device, subscriber, or router filter.</span></div>}
      </div>
      <div className="table-footer"><span>Showing <b>{sessions.length}</b> of <b>{snapshot.sessions.length}</b> sessions</span><span>Actions are sent to the API when connected.</span></div>
    </section>
    <div className="workspace-note"><span className="note-dot"/> Session controls pause, resume, extend, or disconnect a device.</div>
  </div>;
}

function SessionRow({ session, routerName, busy, now, onAction }: { session: SessionRow; routerName: string; busy: boolean; now: number; onAction: (session: SessionRow, action: SessionAction) => void }) {
  const expiring = Date.parse(session.expiresAt) - now < 30 * 60_000;
  return <tr className={session.state === "paused" ? "paused-row" : ""}><td><div className="device-cell"><span className="device-icon">⌕</span><div><strong>{session.subscriber}</strong><span className="mac-address">{session.mac} · {session.ipAddress}</span></div></div></td><td><span className="router-name-cell">{routerName.replace("-AP-", " · ")}</span></td><td><span className="uptime">{elapsed(session.startedAt, now)}</span></td><td><span className="rate-cell"><span>↓ {session.downloadKbps} kbps</span><span>↑ {session.uploadKbps} kbps</span></span></td><td className="data-cell">{formatData(session.dataUsedMb)}</td><td><span className={`expiry-pill ${session.state === "paused" ? "is-paused" : expiring ? "expiring" : ""}`}><i/>{session.state === "paused" ? "Paused" : sessionRemaining(session.expiresAt, now)}</span></td><td><div className="session-actions visible-actions"><button disabled={busy} onClick={() => onAction(session, session.state === "paused" ? "resume" : "pause")} title={session.state === "paused" ? "Resume" : "Pause"}>{session.state === "paused" ? "Resume" : "Pause"}</button><button disabled={busy} onClick={() => onAction(session, "extend")} title="Extend session by one hour">+1h</button><button disabled={busy} onClick={() => onAction(session, "disconnect")} title="Disconnect device">End</button></div></td></tr>;
}

interface AccessPlan {
  id: string;
  name: string;
  durationHours: number;
  price: number;
  description: string;
  dataLimitMb: number | null;
  speedLimitMbps: number | null;
  custom: boolean;
}

interface VoucherBatch {
  codes: string[];
  plan: AccessPlan;
  createdAt: string;
}

const defaultPlans: AccessPlan[] = [
  { id: "saa-moja", name: "Saa Moja", durationHours: 1, price: 300, description: "Quick browsing", dataLimitMb: null, speedLimitMbps: null, custom: false },
  { id: "saa-mbili", name: "Saa Mbili", durationHours: 2, price: 500, description: "Short stay", dataLimitMb: null, speedLimitMbps: null, custom: false },
  { id: "kila-siku", name: "Kila Siku", durationHours: 24, price: 1_000, description: "Day pass", dataLimitMb: null, speedLimitMbps: null, custom: false },
  { id: "wiki", name: "Wiki", durationHours: 168, price: 5_000, description: "Weekly access", dataLimitMb: null, speedLimitMbps: null, custom: false },
];
const voucherStorageKey = "project-ig-vouchers-v1";
const durationLabel = (hours: number) => hours % 24 === 0 ? `${hours / 24} ${hours === 24 ? "day" : "days"}` : `${hours} ${hours === 1 ? "hour" : "hours"}`;
const isAccessPlan = (value: unknown): value is AccessPlan => {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<AccessPlan>;
  return typeof plan.id === "string" && typeof plan.name === "string" && typeof plan.durationHours === "number" && typeof plan.price === "number" && typeof plan.description === "string" && typeof plan.custom === "boolean";
};
const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

function VouchersAndPlans() {
  const [planList, setPlanList] = useState(defaultPlans);
  const [selectedPlanId, setSelectedPlanId] = useState(defaultPlans[0]!.id);
  const [count, setCount] = useState(10);
  const [batch, setBatch] = useState<VoucherBatch | null>(null);
  const [message, setMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", durationHours: "24", price: "1000", dataLimitMb: "", speedLimitMbps: "" });
  const selectedPlan = planList.find((plan) => plan.id === selectedPlanId) ?? planList[0]!;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(voucherStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { plans?: unknown; selectedPlanId?: unknown; batch?: unknown };
        if (Array.isArray(parsed.plans) && parsed.plans.every(isAccessPlan) && parsed.plans.length) setPlanList(parsed.plans);
        if (typeof parsed.selectedPlanId === "string") setSelectedPlanId(parsed.selectedPlanId);
        if (parsed.batch && typeof parsed.batch === "object") {
          const savedBatch = parsed.batch as Partial<VoucherBatch>;
          if (Array.isArray(savedBatch.codes) && savedBatch.codes.every((code) => typeof code === "string") && savedBatch.plan && isAccessPlan(savedBatch.plan)) setBatch(savedBatch as VoucherBatch);
        }
      }
    } catch { /* Ignore unavailable storage or invalid saved preview data. */ }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem(voucherStorageKey, JSON.stringify({ plans: planList, selectedPlanId, batch })); }
    catch { /* Keep the preview usable if browser storage is disabled. */ }
  }, [batch, planList, selectedPlanId, storageReady]);

  const createPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (planList.some((plan) => plan.name.toLowerCase() === name.toLowerCase())) {
      setMessage("A plan with that name already exists.");
      return;
    }
    const plan: AccessPlan = {
      id: `custom-${Date.now()}`,
      name,
      description: draft.description.trim() || "Custom access",
      durationHours: Number(draft.durationHours),
      price: Number(draft.price),
      dataLimitMb: draft.dataLimitMb ? Number(draft.dataLimitMb) : null,
      speedLimitMbps: draft.speedLimitMbps ? Number(draft.speedLimitMbps) : null,
      custom: true,
    };
    setPlanList((current) => [...current, plan]);
    setSelectedPlanId(plan.id);
    setDraft({ name: "", description: "", durationHours: "24", price: "1000", dataLimitMb: "", speedLimitMbps: "" });
    setCreateOpen(false);
    setMessage(`${plan.name} added to this browser's plan list.`);
  };
  const removePlan = (id: string) => {
    const remainingPlans = planList.filter((plan) => plan.id !== id);
    setPlanList(remainingPlans);
    if (selectedPlanId === id) setSelectedPlanId(remainingPlans[0]!.id);
    setMessage("Custom plan removed from this browser.");
  };
  const generate = () => {
    const next = Array.from({ length: count }, () => {
      const bytes = new Uint8Array(5);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
      else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
      return `IG-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    });
    setBatch({ codes: next, plan: selectedPlan, createdAt: new Date().toISOString() });
    setMessage(`${next.length} preview codes created for ${selectedPlan.name}.`);
  };
  const download = () => {
    if (!batch) return;
    const header = ["Voucher code", "Plan", "Duration", "Price TZS", "Data limit MB", "Speed limit Mbps"];
    const rows = batch.codes.map((code) => [code, batch.plan.name, durationLabel(batch.plan.durationHours), String(batch.plan.price), batch.plan.dataLimitMb ? String(batch.plan.dataLimitMb) : "", batch.plan.speedLimitMbps ? String(batch.plan.speedLimitMbps) : ""]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "project-ig-voucher-preview.csv"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <div className="workspace-view">
    <div className="preview-banner"><span className="preview-banner-icon">i</span><div><strong>Browser-only preview</strong><span>Plans and voucher batches are saved in this browser only. Codes are not activated on a router or shared with another operator.</span></div></div>
    <section className="plan-section" aria-label="Hotspot plans">
      <div className="plan-section-heading"><div><h2>Access plans</h2><p>Set the access time, TZS price, and optional limits.</p></div><button className="button button-outline" type="button" onClick={() => setCreateOpen((open) => !open)} aria-expanded={createOpen}>{createOpen ? "Close form" : "+ Add access plan"}</button></div>
      {createOpen && <form className="panel workspace-card plan-editor-form" onSubmit={createPlan}>
        <div className="plan-editor-heading"><div><span className="panel-kicker">NEW ACCESS PLAN</span><h2>Plan details</h2></div></div>
        <div className="plan-form-grid">
          <div className="form-field"><label htmlFor="new-plan-name">Plan name</label><input id="new-plan-name" required maxLength={36} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Usiku"/></div>
          <div className="form-field"><label htmlFor="new-plan-description">Short description</label><input id="new-plan-description" maxLength={48} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="e.g. Night access"/></div>
          <div className="form-field"><label htmlFor="new-plan-hours">Access duration (hours)</label><input id="new-plan-hours" type="number" min="1" max="8760" step="1" required value={draft.durationHours} onChange={(event) => setDraft((current) => ({ ...current, durationHours: event.target.value }))}/></div>
          <div className="form-field"><label htmlFor="new-plan-price">Price (TZS)</label><input id="new-plan-price" type="number" min="0" step="100" required value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}/></div>
          <div className="form-field"><label htmlFor="new-plan-data">Data cap (MB, optional)</label><input id="new-plan-data" type="number" min="1" step="1" value={draft.dataLimitMb} onChange={(event) => setDraft((current) => ({ ...current, dataLimitMb: event.target.value }))} placeholder="No cap"/></div>
          <div className="form-field"><label htmlFor="new-plan-speed">Speed limit (Mbps, optional)</label><input id="new-plan-speed" type="number" min="1" step="1" value={draft.speedLimitMbps} onChange={(event) => setDraft((current) => ({ ...current, speedLimitMbps: event.target.value }))} placeholder="No limit"/></div>
        </div>
        <div className="plan-form-actions"><button className="button button-dark" type="submit">Save plan</button><button className="button button-outline" type="button" onClick={() => setCreateOpen(false)}>Cancel</button></div>
      </form>}
      <div className="plan-grid">{planList.map((plan) => <article className={`plan-card ${plan.id === selectedPlanId ? "plan-card-selected" : ""}`} key={plan.id}><div className="plan-card-top"><span className="plan-icon">◷</span><span className="plan-description">{plan.description}</span>{plan.custom && <button type="button" className="plan-remove" onClick={() => removePlan(plan.id)} aria-label={`Remove ${plan.name} plan`}>×</button>}</div><h2>{plan.name}</h2><p>{durationLabel(plan.durationHours)} access{plan.dataLimitMb ? ` · ${formatData(plan.dataLimitMb)} cap` : ""}{plan.speedLimitMbps ? ` · ${plan.speedLimitMbps} Mbps` : ""}</p><div className="plan-price"><strong>{formatMoney(plan.price)}</strong><span>TZS</span></div><button type="button" className="text-link" onClick={() => setSelectedPlanId(plan.id)}>Use this plan <span>→</span></button></article>)}</div>
    </section>
    <section className="workspace-grid voucher-workspace-grid">
      <article className="panel workspace-card voucher-generator"><div className="workspace-card-heading"><span className="panel-kicker">VOUCHER BATCH</span><h2>Prepare access codes</h2><p>Choose a plan and batch size to create a printable preview.</p></div>
        <div className="form-field"><label htmlFor="voucher-plan">Access plan</label><select id="voucher-plan" value={selectedPlan.id} onChange={(event) => setSelectedPlanId(event.target.value)}>{planList.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {durationLabel(plan.durationHours)} · TZS {formatMoney(plan.price)}</option>)}</select></div>
        <div className="form-field"><label htmlFor="voucher-count">Number of codes</label><select id="voucher-count" value={count} onChange={(event) => setCount(Number(event.target.value))}>{[5, 10, 25, 50].map((amount) => <option key={amount} value={amount}>{amount} vouchers</option>)}</select></div>
        <div className="generator-summary"><span>Batch value</span><strong>TZS {formatMoney(selectedPlan.price * count)}</strong></div><button className="button button-dark full-width-button" type="button" onClick={generate}>Generate preview codes</button>
      </article>
      <article className="panel workspace-card generated-card"><div className="generated-heading"><div><span className="panel-kicker">BATCH PREVIEW</span><h2>{batch ? `${batch.codes.length} voucher codes` : "Your codes will appear here"}</h2></div>{batch && <button className="button button-outline" onClick={download}>Download CSV</button>}</div>
        {batch ? <><div className="generated-meta">{batch.plan.name} · {durationLabel(batch.plan.durationHours)} · TZS {formatMoney(batch.plan.price)} each · {formatDate(batch.createdAt)}{batch.plan.dataLimitMb ? ` · ${formatData(batch.plan.dataLimitMb)} cap` : ""}{batch.plan.speedLimitMbps ? ` · ${batch.plan.speedLimitMbps} Mbps` : ""}</div><div className="voucher-code-list">{batch.codes.map((code) => <code key={code}>{code}</code>)}</div><button className="button button-outline" onClick={() => window.print()}>Print voucher sheet</button></> : <div className="empty-state voucher-empty"><strong>No preview generated yet</strong><span>Create a batch to see codes here.</span></div>}
        {message && <p className="inline-success" role="status">{message}</p>}
      </article>
    </section>
  </div>;
}

function TrafficReports({ snapshot }: { snapshot: DashboardSnapshot }) {
  const values = snapshot.trafficByHour;
  const peak = Math.max(...values, 0);
  const peakHour = Math.max(0, values.indexOf(peak));
  const average = values.length ? Math.round(values.reduce((sum, point) => sum + point, 0) / values.length) : 0;
  const totalSales = snapshot.summary.todayTzs;
  return <div className="workspace-view">
    <section className="workspace-stats" aria-label="Today's traffic summary">
      <Stat label="PEAK BANDWIDTH" value={`${peak} Mbps`} note={`Today at ${String(peakHour).padStart(2, "0")}:00`} tone="green" />
      <Stat label="AVERAGE BANDWIDTH" value={`${average} Mbps`} note="Hourly sample average" />
      <Stat label="TODAY'S SALES" value={`TZS ${formatMoney(totalSales)}`} note="Recorded payments" />
    </section>
    <section className="panel workspace-panel traffic-report-panel"><div className="report-heading"><div><span className="panel-kicker">LIVE ACCOUNTING SAMPLE</span><h2>Bandwidth by hour</h2><p>Combined traffic values currently available from the dashboard source.</p></div><span className="report-day">Today · Dar es Salaam</span></div>
      <div className="report-chart" role="img" aria-label="Bar chart of bandwidth by hour"><div className="report-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0 Mbps</span></div><div className="report-bars">{values.map((value, index) => <div className="report-bar-column" key={index}><div className="report-bar-track"><div className={`report-bar ${index === peakHour ? "report-bar-peak" : ""}`} style={{ height: `${Math.max(3, value / Math.max(peak, 1) * 100)}%` }} title={`${String(index).padStart(2, "0")}:00 · ${value} Mbps`}/></div><span>{index % 4 === 0 ? `${String(index).padStart(2, "0")}:00` : ""}</span></div>)}</div></div>
      <div className="chart-legend"><span><i className="legend-mark"/> Hourly traffic</span><span className="chart-note">Peak <strong>{peak} Mbps</strong> · {String(peakHour).padStart(2, "0")}:00</span></div>
    </section>
    <section className="panel workspace-panel report-router-panel"><div className="panel-heading"><div><h2>Router activity</h2><p>Current connected users by router location</p></div></div><div className="location-traffic-list">{snapshot.routers.map((router) => <div className="location-traffic-row" key={router.routerId}><div className={`router-icon ${router.online ? "router-icon-online" : "router-icon-offline"}`}>⌁</div><div className="location-traffic-name"><strong>{router.name}</strong><span>{router.model}</span></div><div className="location-traffic-meter"><span><i style={{ width: `${Math.min(100, router.connectedUsers * 25)}%` }}/></span><small>{router.connectedUsers} connected</small></div><span className={`router-state ${router.online ? "is-online" : "is-offline"}`}><i/>{router.online ? "Online" : "Offline"}</span></div>)}</div></section>
    <div className="workspace-note"><span className="note-dot"/> Historical daily and weekly charts will appear when time-series accounting is connected.</div>
  </div>;
}

function SetupGuide() {
  const [copied, setCopied] = useState("");
  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 2_000); }
    catch { setCopied("Clipboard unavailable"); window.setTimeout(() => setCopied(""), 2_000); }
  };
  return <div className="workspace-view">
    <div className="preview-banner"><span className="preview-banner-icon">i</span><div><strong>Router connection guide</strong><span>Connect a location after the API and database credentials are configured for your environment.</span></div></div>
    <section className="workspace-grid guide-grid">
      <article className="panel workspace-card guide-progress"><span className="panel-kicker">GETTING STARTED</span><h2>Bring a hotspot online</h2><p>Follow these steps for each location. Keep router secrets on the server and out of the browser.</p><ol className="guide-steps">
        <li><span className="guide-step-number">01</span><div><strong>Prepare the service</strong><p>Set the API environment values and run the database migrations for this installation.</p><button className="text-link" onClick={() => copy("API", "pnpm --filter @project-ig/api dev")}>Copy API dev command →</button></div></li>
        <li><span className="guide-step-number">02</span><div><strong>Choose a router adapter</strong><p>Select MikroTik RouterOS, OpenWrt, or a RADIUS-compatible router for the location.</p></div></li>
        <li><span className="guide-step-number">03</span><div><strong>Register the location</strong><p>Add the router ID, location name, and adapter details to the server-side configuration.</p></div></li>
        <li><span className="guide-step-number">04</span><div><strong>Verify accounting</strong><p>Confirm a test session, payment event, and disconnect action from the dashboard.</p></div></li>
      </ol>{copied && <p className="inline-success" role="status">{copied === "API" ? "API command copied" : copied}</p>}</article>
      <article className="panel workspace-card adapter-card"><span className="panel-kicker">SUPPORTED ADAPTERS</span><h2>Router platforms</h2><div className="adapter-list"><div><span className="adapter-mark">M</span><div><strong>MikroTik RouterOS</strong><span>Hotspot sessions and RouterOS API adapter</span></div><b>READY</b></div><div><span className="adapter-mark">O</span><div><strong>OpenWrt</strong><span>RADIUS-backed access and accounting</span></div><b>READY</b></div><div><span className="adapter-mark">R</span><div><strong>RADIUS compatible</strong><span>Generic session accounting adapter</span></div><b>READY</b></div></div><div className="security-note"><strong>Keep credentials private</strong><span>Store router passwords, payment keys, and database access in server environment variables.</span></div></article>
    </section>
  </div>;
}

function SettingsView({ snapshot, socketLive, lastUpdated, onNavigate }: WorkspaceViewsProps) {
  return <div className="workspace-view">
    <div className="workspace-grid settings-top-grid">
      <section className="panel workspace-card"><span className="panel-kicker">WORKSPACE</span><h2>Project IG operations</h2><p className="settings-description">A local hotspot operations workspace configured for Tanzanian shillings and East Africa Time.</p><div className="settings-detail-list"><div><span>Primary location</span><strong>Kijitonyama</strong></div><div><span>Currency</span><strong>TZS · Tanzanian shilling</strong></div><div><span>Time zone</span><strong>Africa / Dar es Salaam</strong></div><div><span>Web data</span><strong>{socketLive ? "Live API connection" : "Demo snapshot"}</strong></div><div><span>Last update</span><strong>{new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(lastUpdated)}</strong></div></div></section>
      <section className="panel workspace-card connection-card"><span className="panel-kicker">SERVICE CONNECTIONS</span><h2>System status</h2><div className="connection-row"><span className={`connection-icon ${socketLive ? "connection-good" : "connection-wait"}`}>↔</span><div><strong>Realtime dashboard</strong><span>{socketLive ? "Connected through Socket.IO" : "Showing sample data while the API is unavailable"}</span></div><b className={socketLive ? "connection-status-good" : "connection-status-wait"}>{socketLive ? "LIVE" : "DEMO"}</b></div><div className="connection-row"><span className="connection-icon connection-wait">▦</span><div><strong>Router locations</strong><span>{snapshot.summary.onlineRouters} online of {snapshot.summary.routerCount} configured</span></div><b className="connection-status-wait">{snapshot.summary.routerCount - snapshot.summary.onlineRouters ? "CHECK" : "OK"}</b></div><button className="button button-outline settings-guide-button" onClick={() => onNavigate("Setup guide")}>Open router setup guide →</button></section>
    </div>
    <section className="panel workspace-panel settings-router-panel"><div className="panel-heading"><div><h2>Router locations</h2><p>Connection health reported by the active data source</p></div><button className="text-link" onClick={() => onNavigate("Setup guide")}>Add location guide →</button></div><div className="router-settings-list">{snapshot.routers.map((router) => <div className="router-settings-row" key={router.routerId}><span className={`router-icon ${router.online ? "router-icon-online" : "router-icon-offline"}`}>⌁</span><div className="router-settings-name"><strong>{router.name}</strong><span>{router.routerId} · {router.model}</span></div><div className="router-settings-users">{router.connectedUsers} connected</div><span className={`router-state ${router.online ? "is-online" : "is-offline"}`}><i/>{router.online ? "Online" : `Seen ${elapsed(router.lastSeenAt, lastUpdated.getTime())} ago`}</span></div>)}</div></section>
    <div className="workspace-note"><span className="note-dot"/> Router credentials and payment provider secrets are managed by the API environment.</div>
  </div>;
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "green" }) {
  return <article className="workspace-stat"><span className="metric-label">{label}</span><strong className={tone === "green" ? "stat-value stat-value-green" : "stat-value"}>{value}</strong><span className="stat-note">{note}</span></article>;
}



