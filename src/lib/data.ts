import { unstable_cache } from "next/cache";
import { fetchAllCards, providerStatus } from "./providers";
import { DEFAULT_REVALIDATE, MARKET_CACHE_TAG } from "./providers/http";
import { scoreAll } from "./scoring";
import type { CardMarketData, CardsResponse } from "./types";

/**
 * Upstream market data, cached (default 12h) so page loads don't spend
 * free-tier API calls. The Refresh button calls /api/refresh, which
 * invalidates MARKET_CACHE_TAG.
 */
const getMarketData = unstable_cache(
  async (): Promise<{ cards: CardMarketData[]; fetchedAt: string }> => {
    const fetchedAt = new Date().toISOString();
    const cards = await fetchAllCards();
    return { cards: cards.map((c) => ({ ...c, lastUpdated: fetchedAt })), fetchedAt };
  },
  ["market-data-v1"],
  { revalidate: DEFAULT_REVALIDATE, tags: [MARKET_CACHE_TAG] },
);

/** Scoring is cheap and runs on every request, so weight changes apply immediately. */
export async function getCardsData(): Promise<CardsResponse> {
  const { cards, fetchedAt } = await getMarketData();
  return { cards: scoreAll(cards), generatedAt: fetchedAt, providers: providerStatus() };
}
