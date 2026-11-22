"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sample } from "../lib/sample";

const NAV = ["Overview", "Support", "Campaigns", "Spend", "Journeys"];
const CARDS = [
  { key: "New", cls: "k1", label: "Not yet responded", tip: "Needs a first reply" },
  { key: "Pending", cls: "k2", label: "Pending with staff", tip: "An agent is working on it" },
  { key: "Waiting", cls: "k3", label: "Waiting on customer", tip: "The customer must reply" },
  { key: "Closed", cls: "k4", label: "Closed or resolved", tip: "Done" },
];
const SLA = 240;
const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "0%");
const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
const ini = (n) => String(n || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const isLive = (s) => /live|run|send|active/i.test(s || "");
const sum = (a, k) => a.reduce((x, y) => x + (y[k] || 0), 0);

function Glass({ children }) { return <span className="glass">{children}</span>; }
function Stat({ cls = "", label, value, tip, onClick, on }) {
  return (
    <button className={`kpi ${cls}${on ? " on" : ""}`} onClick={onClick} type="button">
      <small>{label}</small><b>{value}</b>{tip && <Glass><strong>{tip}</strong></Glass>}
    </button>
  );
}
function Bars({ items, fmtv = (v) => v }) {
  const max = Math.max(1, ...items.map((i) => i.v));
  return <div className="hbars">{items.map((i) => (
    <div key={i.k} className="hb"><span>{i.k}</span><div><i style={{ width: `${(i.v / max) * 100}%` }} /></div><em>{fmtv(i.v)}</em></div>
  ))}</div>;
}
function Line({ pts }) {
  if (pts.length < 2) return <div className="empty">Not enough data yet.</div>;
  const max = Math.max(1, ...pts.map((p) => p.amount)), W = 600, H = 120;
  const xy = pts.map((p, i) => `${(i / (pts.length - 1)) * W},${H - (p.amount / max) * (H - 10) - 5}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="line" role="img" aria-label="Daily spend">
      <polyline points={`0,${H} ${xy.join(" ")} ${W},${H}`} fill="var(--blue)" opacity=".12" />
      <polyline points={xy.join(" ")} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={xy[i].split(",")[0]} cy={xy[i].split(",")[1]} r="6" fill="transparent"><title>{`${p.date}: ${inr(p.amount)}`}</title></circle>)}
    </svg>
  );
}
function Table({ cols, rows, empty = "Nothing to show yet." }) {
  const tpl = { gridTemplateColumns: cols.map((c) => c.w || "1fr").join(" ") };
  return (
    <div className="tbl">
      <div className="trow head" style={tpl}>{cols.map((c) => <span key={c.h}>{c.h}</span>)}</div>
      {rows.length === 0 && <div className="empty">{empty}</div>}
      {rows.map((r, i) => <div className="trow" style={tpl} key={i}>{cols.map((c) => <span key={c.h}>{c.f(r)}</span>)}</div>)}
    </div>
  );
}

export default function Page() {
  const [data, setData] = useState({ ...sample, status: { support: "sample", campaigns: "sample", journeys: "sample", billing: "sample" }, syncedAt: null, live: false });
  const [tab, setTab] = useState("Overview");
  const [theme, setTheme] = useState("light");
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(null);
  const [tasks, setTasks] = useState([{ t: "Reply to urgent WhatsApp tickets before 2 pm", d: false }, { t: "Check wallet runway before Diwali broadcast", d: false }, { t: "Assign new tickets to evening shift", d: true }]);
  const [draft, setDraft] = useState("");

  const sync = useCallback(async (force) => {
    setSyncing(true);
    try {
      const r = await fetch("/api/sync" + (force ? "?force=1" : ""), { cache: "no-store" });
      if (!r.ok) throw new Error("Sync failed (" + r.status + ")");
      setData(await r.json()); setErr("");
    } catch (e) { setErr(e.message + ". Showing the last data."); }
    setSyncing(false);
  }, []);
  useEffect(() => { sync(false); const id = setInterval(() => sync(false), 300000); return () => clearInterval(id); }, [sync]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const { tickets, campaigns, journeys, billing, agents, hours } = data;
  const open = tickets.filter((t) => t.status !== "Closed");
  const breached = open.filter((t) => t.waitMins > SLA).length;
  const liveC = campaigns.filter((c) => isLive(c.status));
  const mktSpend = sum(campaigns, "cost"), mktRev = sum(campaigns, "revenue");
  const rows = useMemo(() => tickets.filter((t) => (!filter || t.status === filter) && `${t.customer} ${t.id} ${t.subject} ${t.assignee} ${t.channel}`.toLowerCase().includes(q.toLowerCase())), [tickets, q, filter]);
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const cells = [...Array((first + 6) % 7).fill(0), ...Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, i) => i + 1)];
  const maxH = Math.max(1, ...hours);
  const badges = Object.entries(data.status);
  const syncedAt = data.syncedAt ? new Date(data.syncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "…";

  const campCols = [
    { h: "Campaign", w: "2fr", f: (c) => <b>{c.name}</b> }, { h: "Channel", f: (c) => c.channel },
    { h: "Status", f: (c) => <span className={"st " + (isLive(c.status) ? "Closed" : /sched/i.test(c.status) ? "Pending" : "Waiting")}>{c.status}</span> },
    { h: "Sent", f: (c) => c.sent.toLocaleString("en-IN") }, { h: "Read", f: (c) => pct(c.read, c.delivered) },
    { h: "Clicks", f: (c) => c.clicked }, { h: "Orders", f: (c) => c.orders },
    { h: "Revenue", f: (c) => inr(c.revenue) }, { h: "Cost", f: (c) => inr(c.cost) },
    { h: "ROI", f: (c) => (c.cost ? (c.revenue / c.cost).toFixed(1) + "x" : "–") },
  ];
  const funnel = [["Sent", sum(campaigns, "sent")], ["Delivered", sum(campaigns, "delivered")], ["Read", sum(campaigns, "read")], ["Clicked", sum(campaigns, "clicked")], ["Orders", sum(campaigns, "orders")]];

  return (
    <div className="shell">
      <aside className="side">
        <div className="logo">CDC</div>
        {NAV.map((n) => <button key={n} className={"nav" + (tab === n ? " on" : "")} onClick={() => setTab(n)}><span>●</span>{n}</button>)}
        <button className="fab" aria-label="Sync now" onClick={() => sync(true)}>{syncing ? "…" : "↻"}</button>
      </aside>

      <main className="main">
        <div className="top">
          <h1>{tab}</h1>
          {tab === "Support" && <input className="search" placeholder="Search customer, order, agent" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tickets" />}
          <div className="sync">
            <span className="mute">Synced {syncedAt}, auto every 5 min</span>
            <button className="pill-btn" onClick={() => sync(true)} disabled={syncing}>{syncing ? "Syncing…" : "Sync now"}</button>
            <button className="pill-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? "Dark" : "Light"}</button>
          </div>
        </div>
        <div className="badges">{badges.map(([k, v]) => <span key={k} className={"badge" + (v === "live" ? "" : " sample")} title={v}>{k}: {v === "live" ? "live" : v === "sample" ? "sample data" : "error"}</span>)}</div>
        {err && <div className="alert">{err}</div>}
        {badges.some(([, v]) => v.startsWith("error")) && <div className="alert">Bik did not return data for some sections, so sample data is shown there. {badges.find(([, v]) => v.startsWith("error"))[1]}</div>}

        {tab === "Overview" && (<>
          <section className="kpis6">
            <Stat cls="k2" label="Open tickets" value={open.length} tip={`${breached} past the ${SLA / 60}h SLA`} />
            <Stat cls="k1" label="Past SLA" value={breached} tip="Open longer than 4 hours" />
            <Stat cls="k4" label="Live campaigns" value={liveC.length} tip={liveC.map((c) => c.name).join(", ") || "None running"} />
            <Stat cls="k3" label="Campaign revenue" value={inr(mktRev)} tip={`${campaigns.reduce((a, c) => a + c.orders, 0)} orders`} />
            <Stat cls="k1" label="Spent on Bik (month)" value={inr(billing.spentMonth)} tip="Wallet usage this month" />
            <Stat cls="k2" label="Wallet runway" value={`${billing.runwayDays} days`} tip={`Balance ${inr(billing.balance)}`} />
          </section>
          <div className="g2">
            <section className="box"><h3>Daily Bik spend (30 days)</h3><Line pts={billing.daily} /></section>
            <section className="box"><h3>Revenue by campaign</h3><Bars items={campaigns.slice(0, 6).map((c) => ({ k: c.name, v: c.revenue }))} fmtv={inr} /></section>
            <section className="box"><h3>Tickets by status</h3><Bars items={CARDS.map((c) => ({ k: c.label, v: tickets.filter((t) => t.status === c.key).length }))} /></section>
            <section className="box"><h3>Marketing return</h3><p className="big">{mktSpend ? (mktRev / mktSpend).toFixed(1) : 0}x</p><span className="mute">{inr(mktRev)} revenue on {inr(mktSpend)} campaign cost</span></section>
          </div>
        </>)}

        {tab === "Support" && (<>
          <section className="kpis">{CARDS.map((c) => <Stat key={c.key} cls={c.cls} on={filter === c.key} label={c.label} value={tickets.filter((t) => t.status === c.key).length} tip={filter === c.key ? "Click to clear filter" : c.tip} onClick={() => setFilter(filter === c.key ? null : c.key)} />)}</section>
          <section className="mini">
            <div><b>{open.length}</b><span>Open tickets</span></div>
            <div><b>{open.length ? fmt(Math.round(sum(open, "waitMins") / open.length)) : "0m"}</b><span>Average wait</span></div>
            <div><b>{breached}</b><span>Past {SLA / 60}h SLA</span></div>
            <div><b>{tickets.filter((t) => t.priority === "Urgent").length}</b><span>Urgent</span></div>
          </section>
          <section className="box"><h3>When queries land (9 am to 8 pm)</h3><div className="bars">{hours.map((h, i) => <i key={i} style={{ height: `${(h / maxH) * 100}%` }} title={`${i + 9}:00, ${h} tickets`} />)}</div></section>
          <h3 className="sub">Tickets</h3>
          <div className="tbl">
            <div className="trow head" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}><span>Customer</span><span>Status</span><span>Priority</span><span>Assignee</span></div>
            {rows.length === 0 && <div className="empty">No tickets match. Clear the search or the status filter.</div>}
            {rows.map((t) => (
              <div className="trow hov" key={t.id} style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
                <span className="who"><span className="av">{ini(t.customer)}</span>{t.customer}</span>
                <span><span className={`st ${t.status}`}>{t.status}</span></span>
                <span><span className={`pr ${t.priority}`}>{t.priority}</span></span>
                <span className="who"><span className="av a2">{ini(t.assignee)}</span>{t.assignee}</span>
                <Glass><span>#{t.id} · {t.subject}</span><span>{t.channel} · waiting {fmt(t.waitMins)}</span></Glass>
              </div>
            ))}
          </div>
          <h3 className="sub">Agent performance</h3>
          <Table rows={agents} cols={[{ h: "Agent", w: "1.4fr", f: (a) => <b>{a.name}</b> }, { h: "Assigned", f: (a) => a.assigned }, { h: "Closed", f: (a) => a.closed }, { h: "Open now", f: (a) => a.open }, { h: "First reply", f: (a) => fmt(a.frtMins) }, { h: "Handle time", f: (a) => fmt(a.ahtMins) }, { h: "SLA breaches", f: (a) => a.slaBreaches }, { h: "CSAT", f: (a) => a.csat }]} />
        </>)}

        {tab === "Campaigns" && (<>
          <h3 className="sub">Live now ({liveC.length})</h3>
          <section className="kpis">{liveC.length === 0 && <div className="empty">No campaign is live right now.</div>}
            {liveC.map((c) => <Stat key={c.id} cls="k4" label={`${c.name} · ${c.channel}`} value={inr(c.revenue)} tip={`${pct(c.read, c.delivered)} read · ${c.orders} orders · cost ${inr(c.cost)}`} />)}</section>
          <div className="g2">
            <section className="box"><h3>Funnel across all campaigns</h3><Bars items={funnel.map(([k, v]) => ({ k, v }))} fmtv={(v) => v.toLocaleString("en-IN")} /></section>
            <section className="box"><h3>ROI by campaign</h3><Bars items={campaigns.filter((c) => c.cost).map((c) => ({ k: c.name, v: +(c.revenue / c.cost).toFixed(1) }))} fmtv={(v) => v + "x"} /></section>
          </div>
          <h3 className="sub">All campaigns</h3>
          <Table rows={campaigns} cols={campCols} />
        </>)}

        {tab === "Spend" && (<>
          <section className="kpis">
            <Stat cls="k1" label="Spent on Bik this month" value={inr(billing.spentMonth)} tip="Wallet usage" />
            <Stat cls="k2" label="Wallet balance" value={inr(billing.balance)} tip={`Plan: ${billing.plan || "n/a"}`} />
            <Stat cls="k3" label="Runway" value={`${billing.runwayDays} days`} tip="At the current burn rate" />
            <Stat cls="k4" label="Marketing spend" value={inr(mktSpend)} tip={`Returned ${inr(mktRev)} in revenue`} />
          </section>
          <div className="g2">
            <section className="box"><h3>Spend by channel</h3><Bars items={billing.byChannel.map((c) => ({ k: c.channel, v: c.amount }))} fmtv={inr} /></section>
            <section className="box"><h3>Daily spend (30 days)</h3><Line pts={billing.daily} /></section>
          </div>
          <h3 className="sub">Wallet transactions</h3>
          <Table rows={billing.transactions} cols={[{ h: "Date", f: (t) => t.date }, { h: "Type", f: (t) => t.type }, { h: "Details", w: "3fr", f: (t) => t.desc }, { h: "Amount", f: (t) => <b style={{ color: t.amount < 0 ? "var(--c1i)" : "var(--c4i)" }}>{inr(t.amount)}</b> }]} />
        </>)}

        {tab === "Journeys" && (<>
          <section className="kpis">
            <Stat cls="k4" label="Live journeys" value={journeys.filter((j) => isLive(j.status)).length} />
            <Stat cls="k2" label="In test mode" value={journeys.filter((j) => !isLive(j.status)).length} />
            <Stat cls="k3" label="Journey revenue" value={inr(sum(journeys, "revenue"))} />
            <Stat cls="k1" label="Journey cost" value={inr(sum(journeys, "cost"))} />
          </section>
          <Table rows={journeys} cols={[{ h: "Journey", w: "2fr", f: (j) => <b>{j.name}</b> }, { h: "Channel", f: (j) => j.channel }, { h: "Status", f: (j) => <span className={"st " + (isLive(j.status) ? "Closed" : "Waiting")}>{j.status}</span> }, { h: "Entered", f: (j) => j.entries.toLocaleString("en-IN") }, { h: "Revenue", f: (j) => inr(j.revenue) }, { h: "Cost", f: (j) => inr(j.cost) }]} />
        </>)}
      </main>

      <aside className="rail">
        <h3>{now.toLocaleString("en-IN", { month: "long", year: "numeric" })}</h3>
        <div className="cal">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d}>{d}</span>)}
          {cells.map((d, i) => <span key={i} className={d ? (d === now.getDate() ? "d today" : "d") : ""}>{d || ""}</span>)}
        </div>
        <h3>Today’s tasks</h3>
        {tasks.map((k, i) => (
          <label key={i} className={"task" + (k.d ? " done" : "")}>
            <input type="checkbox" checked={k.d} onChange={() => setTasks(tasks.map((x, j) => (j === i ? { ...x, d: !x.d } : x)))} /><span>{k.t}</span>
          </label>
        ))}
        <div className="add"><input placeholder="Add a new task" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { setTasks([...tasks, { t: draft.trim(), d: false }]); setDraft(""); } }} /></div>
      </aside>
    </div>
  );
}
