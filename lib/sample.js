export const AGENTS = ["Ashish", "Sushanto", "Ayush", "Deepti", "Twinkle"];
const C = ["Kaylynn Bator","Carter Culhane","Alena Press","Ashlynn Curtis","Desirae Bator","Abram Stanton","Aarav Mehta","Ishita Rao"];
const S = ["Waiting", "Pending", "New", "Closed"], P = ["Low", "High", "Urgent", "Low"], CH = ["WhatsApp", "Email", "Instagram", "Call"];
const T = ["Order delayed", "Size exchange", "Refund status", "Authenticity query", "Payment failed", "Store pickup"];
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
export const sample = {
  tickets: Array.from({ length: 16 }, (_, i) => ({ id: 82372 + i * 37, customer: C[i % 8], subject: T[i % 6], channel: CH[i % 4], status: S[(i * 3) % 4], priority: P[(i * 5) % 4], assignee: AGENTS[i % 5], waitMins: 12 + ((i * 47) % 380) })),
  hours: [4, 9, 22, 31, 38, 34, 27, 33, 41, 29, 18, 8],
  agents: AGENTS.map((name, i) => ({ name, assigned: 60 + i * 9, closed: 52 + i * 8, open: 3 + i, frtMins: 6 + i * 2, ahtMins: 14 + i * 3, slaBreaches: i, csat: +(4.8 - i * 0.12).toFixed(1) })),
  campaigns: [
    ["Jordan 4 restock alert", "WhatsApp", "Live", 5200, 4890, 3610, 812, 96, 412000, 3120],
    ["Yeezy slide drop", "WhatsApp", "Live", 3800, 3550, 2480, 540, 61, 268000, 2280],
    ["Diwali early access", "Email", "Scheduled", 9000, 0, 0, 0, 0, 0, 0],
    ["Cart abandon nudge", "WhatsApp", "Live", 1900, 1810, 1330, 390, 74, 188000, 1140],
    ["New Balance 530 launch", "Email", "Completed", 12000, 11650, 4120, 690, 38, 151000, 960],
    ["Mumbai store opening", "WhatsApp", "Completed", 4400, 4130, 3220, 470, 29, 96000, 2640],
    ["Hyderabad pop-up", "Instagram", "Completed", 2600, 2490, 1510, 260, 18, 64000, 1560],
    ["Sneaker care kit", "Email", "Completed", 8000, 7720, 2610, 310, 22, 41000, 640],
  ].map(([name, channel, status, sent, delivered, read, clicked, orders, revenue, cost], i) => ({ id: "c" + i, name, channel, status, sent, delivered, read, clicked, orders, revenue, cost })),
  journeys: [
    ["Abandoned cart", "WhatsApp", "Live", 2140, 164000, 5200], ["COD confirmation", "WhatsApp", "Live", 3320, 0, 6100],
    ["Order tracking", "WhatsApp", "Live", 4100, 0, 4300], ["Win-back 60 days", "Email", "Test", 0, 0, 0], ["Welcome series", "Email", "Live", 980, 42000, 700],
  ].map(([name, channel, status, entries, revenue, cost], i) => ({ id: "j" + i, name, channel, status, entries, revenue, cost })),
  billing: {
    balance: 18450, runwayDays: 21, plan: "Growth", spentMonth: 24720,
    byChannel: [{ channel: "WhatsApp", amount: 17300 }, { channel: "Email", amount: 3200 }, { channel: "Instagram", amount: 1900 }, { channel: "Platform fee", amount: 2320 }],
    daily: Array.from({ length: 30 }, (_, i) => ({ date: day(29 - i), amount: 450 + ((i * 137) % 520) })),
    transactions: [
      { date: day(1), type: "Debit", desc: "Broadcast: Jordan 4 restock alert", amount: -3120 }, { date: day(3), type: "Credit", desc: "Wallet recharge", amount: 25000 },
      { date: day(4), type: "Debit", desc: "Daily WhatsApp usage", amount: -980 }, { date: day(6), type: "Debit", desc: "Broadcast: Yeezy slide drop", amount: -2280 },
      { date: day(9), type: "Debit", desc: "Journey: Abandoned cart", amount: -1240 },
    ],
  },
};
