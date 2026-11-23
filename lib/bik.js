import { sample } from "./sample";
import snap from "./snapshot.json";
const KEYS = { support: ["tickets", "agents", "hours"], campaigns: ["campaigns", "campaignSummary"], journeys: ["journeys"], billing: ["billing"] };
const TTL = 5 * 60 * 1000;
const SECTIONS = ["support", "campaigns", "journeys", "billing"];
let cache = null;
const num = (v) => Number(v) || 0;
const pick = (o, ...k) => { for (const x of k) if (o && o[x] != null) return o[x]; };
const list = (d) => (Array.isArray(d) ? d : (d && (d.items || d.data || d.rows || d.tickets || d.campaigns || d.journeys || d.agents || d.transactions || d.results)) || []);
const stage = (s) => { s = String(s || ""); return /clos|resolv/i.test(s) ? "Closed" : /wait/i.test(s) ? "Waiting" : /new|unassign|open/i.test(s) ? "New" : "Pending"; };

async function open() {
  const url = process.env.BIK_MCP_URL;
  const h = { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${process.env.BIK_MCP_TOKEN}` };
  let sid, id = 0;
  const rpc = async (method, params, notify) => {
    const r = await fetch(url, { method: "POST", headers: { ...h, ...(sid ? { "mcp-session-id": sid } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", ...(notify ? {} : { id: ++id }), method, params }), signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`Bik MCP HTTP ${r.status}`);
    sid = r.headers.get("mcp-session-id") || sid;
    if (notify) return;
    const t = await r.text();
    const body = /(^|\n)data:/.test(t) ? t.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).pop() : t;
    const j = JSON.parse(body);
    if (j.error) throw new Error(j.error.message);
    return j.result;
  };
  await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "cdc-dashboard", version: "1.0" } });
  await rpc("notifications/initialized", {}, true);
  return async (name, args = {}) => {
    const res = await rpc("tools/call", { name, arguments: args });
    const t = res && res.content && res.content.find((c) => c.type === "text");
    if (!t) return res;
    try { return JSON.parse(t.text); } catch { return { text: t.text }; }
  };
}

const mappers = {
  async support(call, raw) {
    const [t, a] = await Promise.all([call("helpdesk_filter_tickets"), call("helpdesk_get_agent_performance")]);
    raw.tickets = t; raw.agents = a;
    return {
      tickets: list(t).map((x) => ({ id: pick(x, "id", "ticketId", "ticket_id"), customer: pick(x, "customer", "customerName", "name") || "Customer", subject: pick(x, "subject", "summary", "intent") || "", channel: pick(x, "channel") || "", status: stage(pick(x, "stage", "status")), priority: pick(x, "priority") || "Low", assignee: pick(x, "assignee", "agent", "agentName") || "Unassigned", waitMins: num(pick(x, "waitMins", "waitingMinutes", "ageMinutes")) })),
      agents: list(a).map((x) => ({ name: pick(x, "name", "agent", "agentName"), assigned: num(pick(x, "assigned", "ticketsAssigned")), closed: num(pick(x, "closed", "ticketsClosed")), open: num(pick(x, "open", "openTickets")), frtMins: num(pick(x, "frtMins", "frt")), ahtMins: num(pick(x, "ahtMins", "aht")), slaBreaches: num(pick(x, "slaBreaches", "sla_breaches")), csat: num(pick(x, "csat")) })),
    };
  },
  async campaigns(call, raw) {
    const c = await call("campaigns_list"); raw.campaigns = c;
    return { campaigns: list(c).map((x) => ({ id: pick(x, "id", "campaignId", "_id"), name: pick(x, "name", "title") || "Campaign", channel: pick(x, "channel") || "", status: pick(x, "status", "state") || "", sent: num(pick(x, "sent")), delivered: num(pick(x, "delivered")), read: num(pick(x, "read")), clicked: num(pick(x, "clicked", "clicks")), orders: num(pick(x, "orders")), revenue: num(pick(x, "revenue")), cost: num(pick(x, "cost", "spend")) })) };
  },
  async journeys(call, raw) {
    const j = await call("journeys_list", { includeRevenue: true }); raw.journeys = j;
    return { journeys: list(j).map((x) => ({ id: pick(x, "id", "journeyId"), name: pick(x, "name", "title") || "Journey", channel: pick(x, "channel") || "", status: pick(x, "status", "mode") || (x.isLive ? "Live" : "Test"), entries: num(pick(x, "entries", "customersEntered")), revenue: num(pick(x, "revenue")), cost: num(pick(x, "cost")) })) };
  },
  async billing(call, raw) {
    const [o, u, tx] = await Promise.all([call("billing_getOverview"), call("billing_getUsageBreakdown"), call("billing_getTransactions")]);
    raw.billing = { o, u, tx };
    const balance = pick(o, "balance", "walletBalance");
    if (balance == null) throw new Error("Unexpected billing shape (see ?debug=1)");
    const byChannel = list(pick(u, "byChannel", "channels") || u).map((x) => ({ channel: pick(x, "channel", "name"), amount: num(pick(x, "amount", "spend", "total")) }));
    return { billing: { balance: num(balance), runwayDays: num(pick(o, "runwayDays", "daysRemaining")), plan: pick(o, "plan", "planName") || "", spentMonth: byChannel.reduce((a, b) => a + b.amount, 0) || num(pick(o, "spentThisMonth", "usage")), byChannel, daily: list(pick(u, "daily") || []).map((x) => ({ date: pick(x, "date"), amount: num(pick(x, "amount")) })), transactions: list(tx).map((x) => ({ date: String(pick(x, "date", "createdAt") || "").slice(0, 10), type: pick(x, "type") || "", desc: pick(x, "description", "desc", "note") || "", amount: num(pick(x, "amount")) })) } };
  },
};

export async function getData({ force = false, debug = false } = {}) {
  if (!force && !debug && cache && Date.now() - cache.at < TTL) return cache.data;
  const data = { ...JSON.parse(JSON.stringify(sample)), status: {}, syncedAt: new Date().toISOString(), live: false };
  const raw = {};
  const configured = process.env.BIK_MCP_URL && process.env.BIK_MCP_TOKEN;
  let call = null, openErr = "";
  if (configured) { try { call = await open(); } catch (e) { openErr = e.message; } }
  for (const s of SECTIONS) {
    if (snap.sections && snap.sections[s]) {
      for (const k of KEYS[s]) if (snap.data && snap.data[k] !== undefined) data[k] = snap.data[k];
      data.status[s] = "snapshot " + String(snap.syncedAt || "").slice(0, 10);
    } else data.status[s] = "sample";
    if (!configured) continue;
    if (!call) { data.status[s] = "error: " + openErr; continue; }
    try { Object.assign(data, await mappers[s](call, raw)); data.status[s] = "live"; data.live = true; }
    catch (e) { data.status[s] = "error: " + e.message; }
  }
  if (debug) data.raw = raw;
  if (!debug) cache = { at: Date.now(), data };
  return data;
}
