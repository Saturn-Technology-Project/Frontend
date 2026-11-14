// The console's own probe: is this process serving requests. Reachable without the origin
// secret (src/lib/edge.ts). The API's service report is a different thing, at /saturn-api/status.
export function GET() {
  return Response.json({ status: "ok" });
}
