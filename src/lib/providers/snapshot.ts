import type { MarketProvider } from "./types";

/** Bundled seed values from src/data/cards.ts. Always enabled; lowest priority. */
export const snapshotProvider: MarketProvider = {
  id: "snapshot",
  label: "Bundled snapshot",
  enabled: () => true,
  note: () => "Approximate seed values in src/data/cards.ts. Used when no live source returns a value.",
  async fetchCard(card) {
    const s = card.snapshot;
    return {
      data: { psa10Price: s.psa10Price, psa10Pop: s.psa10Pop, totalGraded: s.totalGraded, rawPrice: s.rawPrice },
      warnings: [],
    };
  },
};
