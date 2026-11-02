import { CARDS } from "@/data/cards";
import { getSet } from "@/data/sets";
import type { CardMarketData, CuratedCard, DataSource } from "@/lib/types";
import type { MarketProvider, ProviderData } from "./types";
import { pokemonPriceTrackerProvider } from "./pokemonPriceTracker";
import { psaProvider } from "./psa";
import { tcgdexProvider } from "./tcgdex";
import { snapshotProvider } from "./snapshot";

/**
 * Providers in PRIORITY ORDER. For each field, the first provider that returns a
 * value wins. To swap or add a data source, edit this array. Nothing else changes.
 */
export const PROVIDERS: MarketProvider[] = [
  pokemonPriceTrackerProvider, // PSA 10 price (+ raw)
  psaProvider, // PSA 10 pop + total graded
  tcgdexProvider, // image + raw price
  snapshotProvider, // fallback for everything
];

const MAX_CONCURRENCY = 6;

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function resolveCard(card: CuratedCard): Promise<CardMarketData> {
  const active = PROVIDERS.filter((p) => p.enabled());
  const results = await Promise.all(active.map(async (p) => ({ p, r: await p.fetchCard(card) })));

  // First provider (by priority) that has a value for `key`.
  const pick = <K extends keyof ProviderData>(key: K): { value?: ProviderData[K]; source: DataSource } => {
    for (const { p, r } of results) {
      const v = r.data[key];
      if (v !== undefined && v !== null) return { value: v, source: p.id };
    }
    return { source: "none" };
  };

  const price = pick("psa10Price");
  const pop = pick("psa10Pop");
  const raw = pick("rawPrice");
  // Sales count / total graded only make sense from the same source as price / pop.
  const salesCount = results.find(({ p }) => p.id === price.source)?.r.data.psa10SalesCount;
  const totalGraded = results.find(({ p }) => p.id === pop.source)?.r.data.totalGraded;

  const set = getSet(card.setId);
  return {
    id: card.id,
    name: card.name,
    setId: card.setId,
    setName: set.name,
    number: card.number,
    rarity: card.rarity,
    imageUrl: pick("imageUrl").value,
    psa10Price: price.value,
    psa10SalesCount: salesCount,
    psa10Pop: pop.value,
    totalGraded,
    rawPrice: raw.value,
    setStrength: set.strength,
    sources: { price: price.source, pop: pop.source, raw: raw.source },
    warnings: results.flatMap(({ r }) => r.warnings),
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchAllCards(): Promise<CardMarketData[]> {
  return mapLimit(CARDS, MAX_CONCURRENCY, resolveCard);
}

export function providerStatus() {
  return PROVIDERS.map((p) => ({ name: p.label, enabled: p.enabled(), note: p.note() }));
}
