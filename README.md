# CDC Support Desk

Next.js dashboard: Overview, Support, Campaigns, Spend, Journeys. Syncs every 5 minutes, plus a Sync now button.

## Run
npm install && npm run dev

## Connect Bik (Vercel > Settings > Environment Variables)
BIK_MCP_URL    server URL from https://dashboard.bik.ai/settings/ai-apps
BIK_MCP_TOKEN  auth key from the same page

Without these, the dashboard shows sample data and labels each section "sample data".
Open /api/sync?debug=1 to see Bik's raw responses if a section shows an error.
