import type { DataSource, Tier } from "@/lib/types";

export const TIER_STYLES: Record<Tier, string> = {
  "Strong Buy": "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
  Buy: "bg-sky-600 text-white dark:bg-sky-500 dark:text-sky-950",
  Watch: "bg-amber-400 text-amber-950 dark:bg-amber-400",
  Avoid: "bg-rose-600 text-white dark:bg-rose-500 dark:text-rose-950",
};

export const TIERS: Tier[] = ["Strong Buy", "Buy", "Watch", "Avoid"];

export function TierBadge({ tier, score }: { tier: Tier; score?: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]}`}
    >
      {tier}
      {score !== undefined && <span className="tabular opacity-80">{score}</span>}
    </span>
  );
}

const SOURCE_LABEL: Record<DataSource, string> = {
  pokemonpricetracker: "PokemonPriceTracker (live)",
  psa: "PSA Public API (live)",
  tcgdex: "TCGdex (live)",
  snapshot: "Snapshot estimate",
  none: "No data",
};

/** Small dot: green = live source, amber = snapshot estimate, grey = none. */
export function SourceDot({ source }: { source: DataSource }) {
  const color =
    source === "snapshot" ? "bg-amber-400" : source === "none" ? "bg-zinc-400" : "bg-emerald-500";
  return (
    <span
      title={SOURCE_LABEL[source]}
      aria-label={SOURCE_LABEL[source]}
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
    />
  );
}

export function sourceLabel(s: DataSource) {
  return SOURCE_LABEL[s];
}

export const fmtUsd = (n?: number) =>
  n === undefined ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

export const fmtNum = (n?: number) => (n === undefined ? "—" : n.toLocaleString("en-US"));

export const fmtCap = (n?: number) =>
  n === undefined
    ? "—"
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : `$${Math.round(n / 1000)}k`;

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function RarityTag({ rarity }: { rarity: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
        rarity === "SIR"
          ? "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300"
          : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
      }`}
    >
      {rarity}
    </span>
  );
}
