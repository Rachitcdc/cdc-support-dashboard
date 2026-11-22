import { getData } from "../../../lib/bik";
export const dynamic = "force-dynamic";
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  return Response.json(await getData({ force: q.get("force") === "1", debug: q.get("debug") === "1" }));
}
