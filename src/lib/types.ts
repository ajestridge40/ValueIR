// Core data model for ValueIR.

export type Rarity = "IR" | "SIR";

export type Tier = "Strong Buy" | "Buy" | "Watch" | "Avoid";

/** Where a value came from. "snapshot" = bundled seed value in src/data/cards.ts. */
export type DataSource = "pokemonpricetracker" | "psa" | "tcgdex" | "snapshot" | "none";

/** A curated card entry: identifiers plus snapshot fallback values. */
export interface CuratedCard {
  /** Stable internal id, also used as the URL / watchlist key. */
  id: string;
  name: string;
  /** Key into SETS (src/data/sets.ts). */
  setId: string;
  number: string;
  rarity: Rarity;
  /** TCGdex card id, e.g. "sv03.5-199". Used for image, catalog check and raw price. */
  tcgdexId?: string;
  /** TCGplayer product id. Lets price providers look the card up exactly. Optional. */
  tcgplayerId?: number;
  /**
   * PSA "spec id" for the card, needed for the PSA Public API population call.
   * Find it in the URL of the card's PSA pop report page. Optional.
   */
  psaSpecId?: number;
  /**
   * Snapshot fallback values, used only when no live provider returns data.
   * These are approximate seed values. Update them from time to time,
   * or configure a live provider.
   */
  snapshot: {
    psa10Price?: number;
    psa10Pop?: number;
    totalGraded?: number;
    rawPrice?: number;
    asOf: string;
  };
}

export interface SetInfo {
  id: string;
  name: string;
  releaseDate: string;
  /** 1–10 long-term desirability score. Hand-tuned; edit freely. */
  strength: number;
  note?: string;
}

/** Fully resolved card market data (curated entry + live/snapshot values). */
export interface CardMarketData {
  id: string;
  name: string;
  setId: string;
  setName: string;
  number: string;
  rarity: Rarity;
  imageUrl?: string;

  psa10Price?: number;
  /** Number of completed sales behind psa10Price, if known. */
  psa10SalesCount?: number;
  psa10Pop?: number;
  /** Total PSA-graded copies (all grades). Used for gem rate. */
  totalGraded?: number;
  /** Ungraded (raw) near-mint market price in USD. */
  rawPrice?: number;

  setStrength: number;

  sources: {
    price: DataSource;
    pop: DataSource;
    raw: DataSource;
  };
  /** Non-fatal problems found while fetching (shown in the detail view). */
  warnings: string[];
  lastUpdated: string;
}

export interface FactorScore {
  key: string;
  label: string;
  /** 0–100, higher = more attractive. null when the input is missing. */
  score: number | null;
  weight: number;
  /** Human-readable value of the input, e.g. "$85" or "pop 1,240". */
  display: string;
}

export interface Recommendation {
  score: number;
  tier: Tier;
  factors: FactorScore[];
  reasons: string[];
  /** 0–1 share of the total weight that had real inputs. */
  confidence: number;
}

export interface ScoredCard extends CardMarketData {
  /** price × pop: total dollar value of every PSA 10 in existence. */
  psa10MarketCap?: number;
  /** PSA 10 / total graded, 0–1. */
  gemRate?: number;
  /** PSA 10 price / raw price. */
  gradedMultiple?: number;
  recommendation: Recommendation;
}

export interface CardsResponse {
  cards: ScoredCard[];
  generatedAt: string;
  providers: { name: string; enabled: boolean; note: string }[];
}
