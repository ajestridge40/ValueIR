import type { MarketProvider } from "./types";
import { errMsg, getJson, num } from "./http";

/**
 * PokemonPriceTracker: https://www.pokemonpricetracker.com/api
 * Free key = 100 credits/day. Graded (PSA 10 eBay sold) data may require the
 * paid tier. If the response has no PSA 10 block, the app falls back to the
 * snapshot price and says so in the card's warnings.
 *
 * The response is parsed defensively (searching for a "psa10"-like object)
 * because field names have changed between API versions.
 */
const KEY = () => process.env.POKEMONPRICETRACKER_API_KEY;
const BASE = process.env.POKEMONPRICETRACKER_BASE_URL ?? "https://www.pokemonpricetracker.com/api/v2";

type Json = Record<string, unknown>;

/** Depth-first search for the first object stored under a key matching `pred`. */
function findKey(obj: unknown, pred: (k: string) => boolean, depth = 0): Json | undefined {
  if (!obj || typeof obj !== "object" || depth > 6) return undefined;
  for (const [k, v] of Object.entries(obj as Json)) {
    if (pred(k) && v && typeof v === "object" && !Array.isArray(v)) return v as Json;
  }
  for (const v of Object.values(obj as Json)) {
    const hit = findKey(v, pred, depth + 1);
    if (hit) return hit;
  }
  return undefined;
}

const isPsa10Key = (k: string) => /^psa[\s_-]?10$/i.test(k);

export const pokemonPriceTrackerProvider: MarketProvider = {
  id: "pokemonpricetracker",
  label: "PokemonPriceTracker",
  enabled: () => Boolean(KEY()),
  note: () =>
    KEY()
      ? "PSA 10 eBay sold medians (if your plan includes graded data) and raw prices."
      : "Disabled. Set POKEMONPRICETRACKER_API_KEY (free tier) to enable.",
  async fetchCard(card) {
    const params = new URLSearchParams({ limit: "1", includeEbay: "true" });
    if (card.tcgplayerId) params.set("tcgPlayerId", String(card.tcgplayerId));
    else params.set("search", `${card.name} ${card.number}`);
    try {
      const body = await getJson<Json>(`${BASE}/cards?${params}`, {
        headers: { Authorization: `Bearer ${KEY()}` },
      });
      const list = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
      const hit = list[0] as Json | undefined;
      if (!hit) return { data: {}, warnings: ["PokemonPriceTracker: no matching card."] };

      const psa10 = findKey(hit, isPsa10Key);
      const price =
        num(psa10?.medianPrice) ?? num(psa10?.median) ?? num(psa10?.averagePrice) ?? num(psa10?.avg) ?? num(psa10?.marketPrice);
      const count = num(psa10?.count) ?? num(psa10?.salesCount) ?? num(psa10?.sales);
      const prices = (hit.prices ?? {}) as Json;
      const raw = num(prices.market) ?? num(prices.marketPrice) ?? num(hit.marketPrice);

      return {
        data: { psa10Price: price, psa10SalesCount: count, rawPrice: raw },
        warnings: price ? [] : ["PokemonPriceTracker returned no PSA 10 sales (graded data may need a paid plan)."],
      };
    } catch (e) {
      return { data: {}, warnings: [`PokemonPriceTracker: ${errMsg(e)}`] };
    }
  },
};
