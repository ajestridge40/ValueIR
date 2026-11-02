/** Tag shared by every cached upstream fetch; revalidated by the Refresh button. */
export const MARKET_CACHE_TAG = "market-data";

/** Default cache lifetime for upstream data (seconds). Free tiers are ~100 calls/day. */
export const DEFAULT_REVALIDATE = Number(process.env.MARKET_REVALIDATE_SECONDS ?? 60 * 60 * 12);

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** JSON GET with timeout + Next.js data cache. */
export async function getJson<T = unknown>(
  url: string,
  init: { headers?: Record<string, string>; revalidate?: number } = {},
): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: init.revalidate ?? DEFAULT_REVALIDATE, tags: [MARKET_CACHE_TAG] },
  });
  if (!res.ok) throw new HttpError(res.status, `${res.status} ${res.statusText} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

/** Turn "12.5", 12.5, "$1,200" into a positive number, else undefined. */
export function num(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Loose name comparison: "Team Rocket's Mewtwo ex" ~ "Team Rocket’s Mewtwo EX". */
export function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, "");
  return norm(a) === norm(b);
}
