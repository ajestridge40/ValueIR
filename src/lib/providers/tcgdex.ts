import type { MarketProvider } from "./types";
import { errMsg, getJson, num, sameName } from "./http";

/**
 * TCGdex: free, open-source, no API key. https://tcgdex.dev
 * Supplies the card image, a catalog sanity check, and the raw (ungraded) price
 * (TCGplayer market price in USD, with Cardmarket EUR as a fallback).
 * TCGdex has no graded prices or population data.
 */
interface TcgdexCard {
  name?: string;
  image?: string;
  pricing?: {
    tcgplayer?: Record<string, unknown> & { unit?: string };
    cardmarket?: { avg?: number; trend?: number; unit?: string };
  };
}

const EUR_TO_USD = Number(process.env.EUR_TO_USD ?? 1.08);

function tcgplayerMarket(tp: Record<string, unknown> | undefined): number | undefined {
  if (!tp) return undefined;
  // Variants look like { holofoil: { marketPrice, midPrice, ... }, normal: {...} }.
  for (const key of ["holofoil", "normal", "reverse-holofoil", "reverseHolofoil"]) {
    const v = tp[key] as { marketPrice?: unknown; midPrice?: unknown } | undefined;
    const p = num(v?.marketPrice) ?? num(v?.midPrice);
    if (p) return p;
  }
  return undefined;
}

export const tcgdexProvider: MarketProvider = {
  id: "tcgdex",
  label: "TCGdex",
  enabled: () => process.env.DISABLE_TCGDEX !== "1",
  note: () => "Free, no key. Card images and raw (ungraded) prices.",
  async fetchCard(card) {
    if (!card.tcgdexId) return { data: {}, warnings: [] };
    try {
      const c = await getJson<TcgdexCard>(
        `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(card.tcgdexId)}`,
        { revalidate: 60 * 60 * 24 },
      );
      if (c.name && !sameName(c.name, card.name)) {
        return {
          data: {},
          warnings: [
            `TCGdex id ${card.tcgdexId} is "${c.name}", not "${card.name}". Ignored. Fix tcgdexId in src/data/cards.ts.`,
          ],
        };
      }
      const usd = tcgplayerMarket(c.pricing?.tcgplayer);
      const eur = num(c.pricing?.cardmarket?.trend) ?? num(c.pricing?.cardmarket?.avg);
      return {
        data: {
          imageUrl: c.image ? `${c.image}/high.webp` : undefined,
          rawPrice: usd ?? (eur ? Math.round(eur * EUR_TO_USD * 100) / 100 : undefined),
        },
        warnings: [],
      };
    } catch (e) {
      return { data: {}, warnings: [`TCGdex: ${errMsg(e)}`] };
    }
  },
};
