import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCardsData } from "@/lib/data";
import { MARKET_CACHE_TAG } from "@/lib/providers/http";

/**
 * Re-fetch upstream data. Throttled (default 10 min) so repeated clicks can't
 * burn through free-tier daily quotas. The throttle is per server instance.
 */
const MIN_INTERVAL_MS = Number(process.env.REFRESH_MIN_INTERVAL_SECONDS ?? 600) * 1000;
let lastRefresh = 0;

export async function POST() {
  const now = Date.now();
  const throttled = now - lastRefresh < MIN_INTERVAL_MS;
  if (!throttled) {
    lastRefresh = now;
    revalidateTag(MARKET_CACHE_TAG);
  }
  const data = await getCardsData();
  return NextResponse.json({
    ...data,
    throttled,
    retryInSeconds: throttled ? Math.ceil((MIN_INTERVAL_MS - (now - lastRefresh)) / 1000) : 0,
  });
}
