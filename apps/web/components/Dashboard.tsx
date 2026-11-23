"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { demoSnapshot } from "@/lib/demo-data";
import type { Channel, DashboardSnapshot, LedgerRow, SessionRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { WorkspaceViews, type WorkspaceView } from "@/components/WorkspaceViews";

type NavigationSection = "Overview" | WorkspaceView;

const money = (amount: number) => new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(amount);
const compactData = (mb: number) => mb >= 1_000 ? `${(mb / 1_000).toFixed(2)} GB` : `${Math.round(mb)} MB`;
const timeOf = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const shortTime = (date: Date) => date.toLocaleTimeString("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit", hour12: false });
const channelLabels: Record<Channel, string> = { mpesa: "M-Pesa", airtel_money: "Airtel Money", halopesa: "HaloPesa", yas: "Yas", cash_voucher: "Cash voucher" };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const shared = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h3"/></>,
    wifi: <><path d="M5 9a11 11 0 0 1 14 0M8 12a6.5 6.5 0 0 1 8 0M11 15a2 2 0 0 1 2 0"/><circle cx="12" cy="18" r=".6" fill="currentColor"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M17 6h3v3"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20M8 7h8"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19 13.5 1.2.9-1.2 2.1-1.5-.4a7.8 7.8 0 0 1-1.5.9l-.3 1.6h-2.4l-.3-1.6a7.8 7.8 0 0 1-1.5-.9l-1.5.4-1.2-2.1 1.2-.9a7 7 0 0 1 0-1.8l-1.2-.9 1.2-2.1 1.5.4a7.8 7.8 0 0 1 1.5-.9l.3-1.6h2.4l.3 1.6a7.8 7.8 0 0 1 1.5.9l1.5-.4 1.2 2.1-1.2.9a7 7 0 0 1 0 1.8Z" transform="translate(-2 -1)"/></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v4h16v-4"/></>,
    print: <><path d="M7 8V3h10v5M7 17H4V9h16v8h-3"/><path d="M7 14h10v7H7z"/><path d="M17 11h1"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    phone: <><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10 5h4m-3 13.5h2"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg {...shared}>{paths[name] ?? paths.grid}</svg>;
}

function TrafficChart({ points }: { points: number[] }) {
  const width = 720; const height = 168; const pad = 5;
  const max = Math.max(...points, 1);
  const coords = points.map((point, index) => `${pad + index * (width - pad * 2) / (points.length - 1)},${height - pad - (point / max) * (height - pad * 3)}`).join(" ");
  const fill = `${pad},${height} ${coords} ${width - pad},${height}`;
  const ticks = ["00", "04", "08", "12", "16", "20", "24"];
  return <div className="traffic-chart" aria-label="Hourly bandwidth use chart">
    <div className="chart-y-labels"><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div>
    <div className="chart-plot">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Bandwidth by hour, megabits per second">
        {[0.05, 0.29, 0.53, 0.77, 0.99].map((ratio) => <line key={ratio} x1="0" x2={width} y1={height * ratio} y2={height * ratio} className="chart-gridline"/>)}
        <polygon points={fill} className="chart-area"/>
        <polyline points={coords} className="chart-line"/>
      </svg>
      <div className="chart-x-labels">{ticks.map((tick) => <span key={tick}>{tick}:00</span>)}</div>
    </div>
    <div className="chart-unit">Mbps</div>
  </div>;
}

function durationSince(value: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function remaining(value: string) {
  const mins = Math.ceil((new Date(value).getTime() - Date.now()) / 60_000);
  if (mins <= 0) return "Expired";
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(demoSnapshot);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const [query, setQuery] = useState("");
  const [socketLive, setSocketLive] = useState(false);
  const [notice, setNotice] = useState("");
  const [navActive, setNavActive] = useState<NavigationSection>("Overview");
  const [busyMac, setBusyMac] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const apiBase = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:4000` : "http://localhost:4000";

  const applySnapshot = useCallback((next: DashboardSnapshot) => { setSnapshot(next); setLastUpdated(new Date()); }, []);
  useEffect(() => {
    let socket: Socket | undefined;
    const load = async () => {
      try { const response = await fetch("/api/dashboard", { cache: "no-store" }); if (response.ok) applySnapshot(await response.json() as DashboardSnapshot); }
      catch { /* Local fixtures keep the ledger available while the API is stopped. */ }
    };
    void load();
    const poll = window.setInterval(() => { void load(); }, 20_000);
    try {
      socket = io(apiBase, { transports: ["websocket", "polling"], reconnectionAttempts: 2, timeout: 2_000 });
      socket.on("connect", () => setSocketLive(true));
      socket.on("disconnect", () => setSocketLive(false));
      socket.on("dashboard:snapshot", (next: DashboardSnapshot) => applySnapshot(next));
      socket.on("connect_error", () => setSocketLive(false));
    } catch { setSocketLive(false); }
    return () => { window.clearInterval(poll); socket?.disconnect(); };
  }, [apiBase, applySnapshot]);

  const total = period === "today" ? snapshot.summary.todayTzs : period === "week" ? snapshot.summary.weekTzs : snapshot.summary.monthTzs;
  const channels = period === "today" ? snapshot.summary.todayChannels : period === "week" ? snapshot.summary.weekChannels : snapshot.summary.monthChannels;
  const matchingEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? snapshot.entries.filter((row) => `${row.reference} ${row.customerLabel} ${row.packageName} ${channelLabels[row.channel]}`.toLowerCase().includes(normalized)) : snapshot.entries;
  }, [query, snapshot.entries]);
  const filteredEntries = navActive === "Sales ledger" || query.trim() ? matchingEntries : matchingEntries.slice(0, 8);

  const runSessionAction = async (session: SessionRow, action: "disconnect" | "pause" | "resume" | "extend") => {
    setBusyMac(session.mac); setNotice("");
    const label: Record<typeof action, string> = { disconnect: "Device disconnected", pause: "Session paused", resume: "Session resumed", extend: "Session extended by one hour" };
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(session.mac)}/${action}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: action === "extend" ? JSON.stringify({ minutes: 60 }) : undefined,
      });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Action failed");
      const updated = await fetch("/api/dashboard", { cache: "no-store" });
      if (updated.ok) applySnapshot(await updated.json() as DashboardSnapshot);
      else setSnapshot((current) => ({ ...current, sessions: action === "disconnect" ? current.sessions.filter((item) => item.mac !== session.mac) : current.sessions.map((item) => item.mac === session.mac ? { ...item, state: action === "pause" ? "paused" : action === "resume" ? "active" : item.state, expiresAt: action === "extend" ? new Date(new Date(item.expiresAt).getTime() + 60 * 60_000).toISOString() : item.expiresAt } : item) }));
      setNotice(label[action]);
    } catch (error) {
      setNotice(error instanceof Error && error.message !== "Failed to fetch" ? error.message : "Demo mode · start the API to send router actions");
    } finally { setBusyMac(null); window.setTimeout(() => setNotice(""), 3_500); }
  };

  const exportCsv = (entries: LedgerRow[] = matchingEntries) => {
    const header = ["Timestamp", "Reference", "Customer / voucher", "Package", "Payment channel", "Amount TZS", "Running balance TZS"];
    const rows = entries.map((row) => [new Date(row.occurredAt).toISOString(), row.reference, row.customerLabel, row.packageName, channelLabels[row.channel], String(row.amountTzs), String(row.balanceTzs)]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `project-ig-ledger-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const periodDate = new Date();
  const dayLabel = periodDate.toLocaleDateString("en-GB", { timeZone: "Africa/Dar_es_Salaam", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const pageCopy: Record<NavigationSection, { title: string; subtitle: string; overline: string }> = {
    Overview: { title: "Daily ledger", subtitle: "Sales, sessions, and router health in one place.", overline: "OPERATOR OVERVIEW" },
    "Sales ledger": { title: "Sales ledger", subtitle: "Review and export every recorded hotspot payment.", overline: "REVENUE · KIJITONYAMA" },
    "Connected users": { title: "Connected users", subtitle: "Monitor active devices and manage access sessions.", overline: "LIVE ACCESS · KIJITONYAMA" },
    "Vouchers & plans": { title: "Vouchers & plans", subtitle: "Review access plans and prepare voucher batches.", overline: "PRODUCTS · KIJITONYAMA" },
    "Traffic reports": { title: "Traffic reports", subtitle: "See current bandwidth use and router activity.", overline: "NETWORK · KIJITONYAMA" },
    "Setup guide": { title: "Setup guide", subtitle: "Connect router locations to the Project IG service.", overline: "GETTING STARTED" },
    Settings: { title: "Settings", subtitle: "Review workspace, service, and router connection status.", overline: "WORKSPACE CONFIGURATION" },
  };
  const { title, subtitle, overline } = pageCopy[navActive];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark"><span/><span/><span/></div><div><span className="brand-name">Project IG</span><span className="brand-caption">WI-FI OPERATIONS</span></div></div>
      <div className="location-selector"><span className="location-symbol"><Icon name="wifi" size={17}/></span><div><span className="eyebrow">CURRENT LOCATION</span><strong>Kijitonyama</strong></div><span className="chevron">⌄</span></div>
      <span className="nav-section-label">WORKSPACE</span>
      <nav className="primary-nav" aria-label="Main navigation">
        {[["Overview", "grid"], ["Sales ledger", "receipt"], ["Connected users", "wifi"], ["Vouchers & plans", "box"], ["Traffic reports", "chart"]].map(([label, icon]) => <button key={label} className={`nav-item ${navActive === label ? "active" : ""}`} aria-current={navActive === label ? "page" : undefined} aria-label={label} onClick={() => setNavActive(label as NavigationSection)}><Icon name={icon!}/><span>{label}</span>{label === "Connected users" && <span className="nav-count">{snapshot.summary.activeDevices}</span>}</button>)}
      </nav>
      <span className="nav-section-label tools-label">TOOLS</span>
      <nav className="primary-nav" aria-label="Tools">
        {[["Setup guide", "book"], ["Settings", "settings"]].map(([label, icon]) => <button key={label} className={`nav-item ${navActive === label ? "active" : ""}`} aria-current={navActive === label ? "page" : undefined} aria-label={label} onClick={() => setNavActive(label as NavigationSection)}><Icon name={icon!}/><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-led">i</span><div><strong>Need a hand?</strong><span>Router setup guide</span></div><Icon name="arrow" size={15}/></div><div className="operator-row"><div className="operator-avatar">JM</div><div className="operator-copy"><strong>Juma M.</strong><span>Location operator</span></div><button className="icon-button operator-more" aria-label="Operator menu"><Icon name="more"/></button></div></div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div className="breadcrumb"><span>Locations</span><span className="crumb-slash">/</span><strong>Kijitonyama</strong></div><div className="topbar-right"><div className="sync-status"><span className={`sync-dot ${socketLive ? "live" : ""}`}/><span>{socketLive ? "Live updates" : "Demo data"}</span></div><span className="topbar-divider"/><button className="date-button"><Icon name="clock" size={15}/>{dayLabel}</button><button className="avatar-button" aria-label="Open operator profile">JM</button></div></header>

      <div className="content-wrap">
        <section className="page-heading"><div><div className="overline"><span className="overline-rule"/>{overline}</div><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-actions"><Button variant="outline" onClick={() => window.print()}><Icon name="print" size={16}/>Print / PDF</Button>{(navActive === "Overview" || navActive === "Sales ledger") && <Button onClick={() => exportCsv()}><Icon name="download" size={16}/>Export ledger</Button>}</div></section>

        {navActive === "Overview" ? <>
        <section className="summary-grid" aria-label="Business summary">
          <article className="summary-card revenue-card"><div className="summary-top"><span className="metric-label">{period === "today" ? "TODAY'S REVENUE" : period === "week" ? "THIS WEEK" : "THIS MONTH"}</span><span className="summary-kicker verified-kicker"><span className="mini-led"/>VERIFIED</span></div><div className="revenue-line"><span className="metric-currency">TZS</span><strong className="metric-value">{money(total)}</strong><span className="delta-pill">↗ 12.8%</span></div><div className="revenue-footer"><div className="channel-split"><span><i className="split-dot mobile-dot"/>Mobile money <b>{money(channels.mobile)}</b></span><span><i className="split-dot cash-dot"/>Cash vouchers <b>{money(channels.cash)}</b></span></div><div className="period-tabs" role="group" aria-label="Revenue period">{(["today", "week", "month"] as const).map((key) => <button key={key} className={period === key ? "selected" : ""} onClick={() => setPeriod(key)}>{key === "today" ? "Day" : key === "week" ? "Week" : "Month"}</button>)}</div></div></article>
          <article className="summary-card"><div className="summary-top"><span className="metric-label">ACTIVE DEVICES</span><span className="metric-icon green-icon"><Icon name="wifi" size={17}/></span></div><div className="metric-line"><strong className="metric-value">{snapshot.summary.activeDevices.toString().padStart(2, "0")}</strong><span className="metric-context">connected now</span></div><div className="metric-foot"><span className="status-text"><span className="status-dot online-dot"/>{snapshot.summary.onlineRouters} routers online</span><span className="secondary-foot">of {snapshot.summary.routerCount}</span></div></article>
          <article className="summary-card"><div className="summary-top"><span className="metric-label">DATA IN USE</span><span className="metric-icon blue-icon"><span className="data-glyph">↕</span></span></div><div className="metric-line"><strong className="metric-value">{compactData(snapshot.summary.dataUsedMb)}</strong></div><div className="metric-foot"><span className="metric-context">Across active sessions</span><span className="secondary-foot">↓ 2.4%</span></div></article>
          <article className="summary-card router-summary"><div className="summary-top"><span className="metric-label">ROUTER STATUS</span><span className="metric-icon"><Icon name="box" size={17}/></span></div><div className="metric-line router-count-line"><strong className="metric-value">{snapshot.summary.onlineRouters}<span className="router-count-total">/{snapshot.summary.routerCount}</span></strong><span className="metric-context">online</span></div><div className="metric-foot"><span className="status-text"><span className="status-dot offline-dot"/>{snapshot.summary.routerCount - snapshot.summary.onlineRouters} needs attention</span></div></article>
        </section>

        <section className="insight-grid">
          <article className="panel traffic-panel"><div className="panel-heading"><div><div className="panel-title-row"><h2>Bandwidth by hour</h2><span className="panel-live"><span className="mini-led"/>LIVE</span></div><p>Combined traffic across all router locations</p></div><button className="select-button">Today <span>⌄</span></button></div><TrafficChart points={snapshot.trafficByHour}/><div className="chart-legend"><span><i className="legend-mark"/>Total traffic</span><span className="chart-note">Peak <strong>81 Mbps</strong> · 16:00</span></div></article>
          <article className="panel router-panel"><div className="panel-heading"><div><h2>Router health</h2><p>{snapshot.summary.onlineRouters} of {snapshot.summary.routerCount} locations reporting</p></div><button className="text-link" onClick={() => setNavActive("Settings")}>Manage <Icon name="arrow" size={14}/></button></div><div className="router-list">{snapshot.routers.map((router) => <div className="router-row" key={router.routerId}><span className={`router-icon ${router.online ? "router-icon-online" : "router-icon-offline"}`}><Icon name="wifi" size={17}/></span><div className="router-info"><strong>{router.name}</strong><span>{router.model}</span></div><div className="router-right"><span className={`router-state ${router.online ? "is-online" : "is-offline"}`}><i/>{router.online ? "Online" : "Offline"}</span><small>{router.online ? `${router.connectedUsers} devices` : `Seen ${durationSince(router.lastSeenAt)} ago`}</small></div></div>)}</div><button className="add-router" onClick={() => setNavActive("Setup guide")}><span>+</span> Add router location</button></article>
        </section>

        <section className="panel ledger-panel"><div className="panel-heading ledger-heading"><div><div className="panel-title-row"><h2>Sales ledger</h2><span className="entry-count">{filteredEntries.length} entries</span></div><p>Chronological record · running balance in TZS</p></div><div className="table-tools"><label className="search-field"><span className="search-symbol">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ledger" aria-label="Search ledger"/><kbd>/</kbd></label><button className="square-tool" aria-label="More ledger options" onClick={() => exportCsv()}><Icon name="more"/></button></div></div>
          <div className="table-scroll"><table className="ledger-table"><thead><tr><th>TIME</th><th>REFERENCE</th><th>CUSTOMER / VOUCHER</th><th>PACKAGE</th><th>CHANNEL</th><th className="amount-col">AMOUNT</th><th className="balance-col">BALANCE</th></tr></thead><tbody>{filteredEntries.map((row) => <LedgerTableRow key={row.id} row={row}/>)}</tbody></table></div>
          <div className="table-footer"><span>Showing <b>{filteredEntries.length ? 1 : 0}–{filteredEntries.length}</b> of <b>{matchingEntries.length}</b> transactions</span><button className="view-all" onClick={() => setNavActive("Sales ledger")}>Open full ledger <Icon name="arrow" size={14}/></button></div>
        </section>

        <section className="panel sessions-panel"><div className="panel-heading sessions-heading"><div><div className="panel-title-row"><h2>Connected users</h2><span className="live-count"><i/> {snapshot.sessions.filter((session) => session.state === "active").length} active</span></div><p>Current sessions across your router locations</p></div><button className="text-link" onClick={() => setNavActive("Connected users")}>All sessions <Icon name="arrow" size={14}/></button></div>
          <div className="table-scroll"><table className="sessions-table"><thead><tr><th>DEVICE / SUBSCRIBER</th><th>ROUTER</th><th>UPTIME</th><th>LIVE RATE ↓ / ↑</th><th>DATA USED</th><th>SESSION</th><th></th></tr></thead><tbody>{snapshot.sessions.map((session) => <SessionTableRow key={session.id} session={session} routerName={snapshot.routers.find((router) => router.routerId === session.routerId)?.name ?? "—"} busy={busyMac === session.mac} onAction={runSessionAction}/>)}</tbody></table></div>
        </section>
        </> : <WorkspaceViews view={navActive} snapshot={snapshot} query={query} onQueryChange={setQuery} onExport={exportCsv} onSessionAction={runSessionAction} busyMac={busyMac} socketLive={socketLive} lastUpdated={lastUpdated} onNavigate={setNavActive}/>}
        <footer className="page-footer"><span>Project IG <b>·</b> TZ / TZS</span><span>Last updated {shortTime(lastUpdated)} <i className={socketLive ? "footer-live" : ""}/></span></footer>
      </div>
      {notice && <div className="toast" role="status"><span className="toast-mark">✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><Icon name="close" size={15}/></button></div>}
    </main>
  </div>;
}

function LedgerTableRow({ row }: { row: LedgerRow }) {
  return <tr><td className="time-cell">{timeOf(row.occurredAt)}</td><td><span className="reference-code">{row.reference}</span></td><td className="customer-cell">{row.customerLabel}</td><td className="package-cell">{row.packageName}</td><td><span className={`channel-tag channel-${row.channel}`}>{row.channel === "cash_voucher" ? <span className="cash-square">T</span> : <span className="channel-initial">{channelLabels[row.channel].slice(0, 1)}</span>}{channelLabels[row.channel]}</span></td><td className="amount-cell">{money(row.amountTzs)} <small>TZS</small></td><td className="balance-cell">{money(row.balanceTzs)}</td></tr>;
}

function SessionTableRow({ session, routerName, busy, onAction }: { session: SessionRow; routerName: string; busy: boolean; onAction: (session: SessionRow, action: "disconnect" | "pause" | "resume" | "extend") => void }) {
  const expiringSoon = (new Date(session.expiresAt).getTime() - Date.now()) < 30 * 60_000;
  return <tr className={session.state === "paused" ? "paused-row" : ""}><td><div className="device-cell"><span className="device-icon"><Icon name="phone" size={15}/></span><div><strong>{session.subscriber}</strong><span className="mac-address">{session.mac} <i>·</i> {session.ipAddress}</span></div></div></td><td><span className="router-name-cell">{routerName.replace("-AP-", " · ")}</span></td><td><span className="uptime"><Icon name="clock" size={13}/>{durationSince(session.startedAt)}</span></td><td className="rate-cell"><span><b>↓</b> {session.downloadKbps} <i>k</i></span><span><b>↑</b> {session.uploadKbps} <i>k</i></span></td><td className="data-cell">{compactData(session.dataUsedMb)}</td><td><span className={`expiry-pill ${session.state === "paused" ? "is-paused" : expiringSoon ? "expiring" : ""}`}><i/>{session.state === "paused" ? "Paused" : remaining(session.expiresAt)}</span></td><td><div className="session-actions"><button disabled={busy} onClick={() => onAction(session, session.state === "paused" ? "resume" : "pause")} aria-label={session.state === "paused" ? "Resume session" : "Pause session"} title={session.state === "paused" ? "Resume" : "Pause"}><span>{session.state === "paused" ? "▶" : "Ⅱ"}</span></button><button disabled={busy} onClick={() => onAction(session, "extend")} aria-label="Extend session by one hour" title="Add 1 hour">+1h</button><button disabled={busy} onClick={() => onAction(session, "disconnect")} aria-label="Disconnect device" title="Disconnect"><Icon name="close" size={14}/></button></div></td></tr>;
}




