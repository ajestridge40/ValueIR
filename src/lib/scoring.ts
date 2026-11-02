import type { CardMarketData, FactorScore, ScoredCard, Tier } from "./types";

/* =============================================================================
 * SCORING CONFIG: tweak these to change how recommendations are made.
 * =============================================================================
 *
 * Each factor maps one input onto a 0–100 "attractiveness" score with a
 * log-scale ramp between a GOOD end (100) and a BAD end (0). Log scale is used
 * because prices and pops span orders of magnitude: $30→$60 matters about as
 * much as $300→$600.
 *
 * Final score = weighted average of the factors that have data. If a factor's
 * input is missing, its weight is dropped and the others are renormalised.
 * "confidence" reports how much of the total weight had real data.
 */
export const WEIGHTS = {
  /** Absolute PSA 10 price. Cheap cards get a strong boost (low downside, easy to hold). */
  price: 0.3,
  /** PSA 10 population. Lower = scarcer. */
  population: 0.25,
  /** Price × pop ("PSA 10 market cap"). Low cap = cheap relative to how many exist. */
  efficiency: 0.2,
  /** Set strength (1–10) from src/data/sets.ts. */
  setStrength: 0.15,
  /** PSA 10 price ÷ raw price. Low multiple = the slab carries little premium over raw. */
  gradedMultiple: 0.1,
} as const;

export const RAMPS = {
  price: { good: 30, bad: 1000 }, // ≤$30 → 100, ≥$1,000 → 0
  population: { good: 500, bad: 20000 }, // ≤500 → 100, ≥20k → 0
  efficiency: { good: 50_000, bad: 5_000_000 }, // cap ≤$50k → 100, ≥$5M → 0
  gradedMultiple: { good: 2, bad: 10 }, // ≤2× raw → 100, ≥10× → 0
} as const;

/** Minimum score for each tier, checked top-down. */
export const TIER_THRESHOLDS: { tier: Tier; min: number }[] = [
  { tier: "Strong Buy", min: 68 },
  { tier: "Buy", min: 55 },
  { tier: "Watch", min: 40 },
  { tier: "Avoid", min: 0 },
];

/** Below this confidence a card is capped at "Watch": not enough data to act on. */
export const MIN_CONFIDENCE_TO_BUY = 0.6;

/* ========================================================================== */

/** Log-scale ramp: value ≤ good → 100, value ≥ bad → 0. */
export function logRamp(value: number, good: number, bad: number): number {
  if (value <= good) return 100;
  if (value >= bad) return 0;
  const t = (Math.log(value) - Math.log(good)) / (Math.log(bad) - Math.log(good));
  return Math.round((1 - t) * 100);
}

const usd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 10_000
      ? `$${Math.round(n / 1000)}k`
      : `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

export function scoreCard(card: CardMarketData): ScoredCard {
  const { psa10Price: price, psa10Pop: pop, rawPrice: raw } = card;
  const cap = price && pop ? price * pop : undefined;
  const multiple = price && raw ? price / raw : undefined;
  const gemRate = pop && card.totalGraded ? pop / card.totalGraded : undefined;

  const factors: FactorScore[] = [
    {
      key: "price",
      label: "Price level",
      weight: WEIGHTS.price,
      score: price ? logRamp(price, RAMPS.price.good, RAMPS.price.bad) : null,
      display: price ? usd(price) : "no PSA 10 price",
    },
    {
      key: "population",
      label: "PSA 10 scarcity",
      weight: WEIGHTS.population,
      score: pop ? logRamp(pop, RAMPS.population.good, RAMPS.population.bad) : null,
      display: pop ? `pop ${pop.toLocaleString()}` : "no pop data",
    },
    {
      key: "efficiency",
      label: "Price-to-pop efficiency",
      weight: WEIGHTS.efficiency,
      score: cap ? logRamp(cap, RAMPS.efficiency.good, RAMPS.efficiency.bad) : null,
      display: cap ? `${usd(cap)} PSA 10 cap` : "needs price + pop",
    },
    {
      key: "setStrength",
      label: "Set strength",
      weight: WEIGHTS.setStrength,
      score: Math.round(card.setStrength * 10),
      display: `${card.setStrength}/10`,
    },
    {
      key: "gradedMultiple",
      label: "Graded premium",
      weight: WEIGHTS.gradedMultiple,
      score: multiple ? logRamp(multiple, RAMPS.gradedMultiple.good, RAMPS.gradedMultiple.bad) : null,
      display: multiple ? `${multiple.toFixed(1)}× raw` : "no raw price",
    },
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const usable = factors.filter((f) => f.score !== null);
  const usableWeight = usable.reduce((s, f) => s + f.weight, 0);
  const score = usableWeight
    ? Math.round(usable.reduce((s, f) => s + (f.score as number) * f.weight, 0) / usableWeight)
    : 0;
  const confidence = usableWeight / totalWeight;

  let tier = TIER_THRESHOLDS.find((t) => score >= t.min)!.tier;
  const capped = confidence < MIN_CONFIDENCE_TO_BUY && (tier === "Strong Buy" || tier === "Buy");
  if (capped) tier = "Watch";

  return {
    ...card,
    psa10MarketCap: cap,
    gemRate,
    gradedMultiple: multiple,
    recommendation: { score, tier, factors, confidence, reasons: buildReasons(card, factors, capped) },
  };
}

/** Short plain-English reasons: the two strongest positives and the weakest factor. */
function buildReasons(card: CardMarketData, factors: FactorScore[], capped: boolean): string[] {
  const reasons: string[] = [];
  const scored = factors.filter((f) => f.score !== null) as (FactorScore & { score: number })[];
  // Rank by contribution relative to weight-average, so heavy factors surface first.
  const byImpact = [...scored].sort((a, b) => b.score * b.weight - a.score * a.weight);

  const phrase = (f: FactorScore & { score: number }, good: boolean) => {
    switch (f.key) {
      case "price":
        return good ? `Low entry price (${f.display})` : `Expensive slab (${f.display})`;
      case "population":
        return good ? `Scarce PSA 10 (${f.display})` : `Plentiful PSA 10s (${f.display})`;
      case "efficiency":
        return good ? `Cheap for its scarcity (${f.display})` : `Rich for its supply (${f.display})`;
      case "setStrength":
        return good ? `Strong set: ${card.setName} (${f.display})` : `Weaker set demand (${f.display})`;
      case "gradedMultiple":
        return good ? `Small premium over raw (${f.display})` : `Big premium over raw (${f.display})`;
      default:
        return f.label;
    }
  };

  for (const f of byImpact.filter((f) => f.score >= 60).slice(0, 2)) reasons.push(phrase(f, true));
  const worst = [...scored].sort((a, b) => a.score - b.score)[0];
  if (worst && worst.score < 40) reasons.push(phrase(worst, false));
  if (card.psa10SalesCount !== undefined && card.psa10SalesCount < 3)
    reasons.push(`Thin sales (${card.psa10SalesCount}); price may be unreliable`);
  if (capped) reasons.push("Capped at Watch: missing key data");
  if (!reasons.length) reasons.push("Middling on every factor");
  return reasons;
}

export function scoreAll(cards: CardMarketData[]): ScoredCard[] {
  return cards.map(scoreCard).sort((a, b) => b.recommendation.score - a.recommendation.score);
}
