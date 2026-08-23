import { getActiveFips } from "@/lib/setu/fips";

export async function GET() {
  try {
    const fips = await getActiveFips();
    return Response.json({ fips });
  } catch (error) {
    console.error("FIP discovery error:", error);
    return Response.json(
      { error: "Failed to fetch FIPs", fips: [] },
      { status: 500 },
    );
  }
}
