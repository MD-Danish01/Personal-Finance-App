import { NextResponse } from "next/server";

/**
 * GET /api/ping
 *
 * Ultra-lightweight connectivity probe used by OfflineProvider.
 * Returns a minimal JSON body so the response is cacheable by the SW
 * but stays under ~50 bytes.
 */
export function GET() {
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        // Never cache this — it must always hit the network
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    },
  );
}
