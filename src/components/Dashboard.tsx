"use client";

import { useEffect, useMemo, useState } from "react";
import type { CardsResponse, ScoredCard, Tier } from "@/lib/types";
import CardDetail from "./CardDetail";
import ThemeToggle from "./ThemeToggle";
import { RarityTag, SourceDot, TierBadge, TIERS, TIER_STYLES, fmtCap, fmtNum, fmtUsd, timeAgo } from "./ui";

type SortKey = "score" | "price" | "pop" | "set" | "cap";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "price", label: "PSA 10 price" },
  { key: "pop", label: "Population" },
  { key: "cap", label: "Efficiency" },
  { key: "set", label: "Set" },
];

const WATCH_KEY = "valueir:watchlist";

function useWatchlist() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      setIds(new Set(JSON.parse(localStorage.getItem(WATCH_KEY) ?? "[]")));
    } catch {}
  }, []);
  const toggle = (id: string) =>
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(WATCH_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  return { ids, toggle };
}

/** Compare with undefined values always sorted last. */
function cmp(a: number | string | undefined, b: number | string | undefined, dir: 1 | -1) {
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return (a < b ? -1 : a > b ? 1 : 0) * dir;
}

export default function Dashboard({ initial }: { initial: CardsResponse }) {
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [query, setQuery] = useState("");
  const [tiers, setTiers] = useState<Set<Tier>>(new Set());
  const [setFilter, setSetFilter] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "score", dir: -1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const watch = useWatchlist();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  async function refresh() {
    setRefreshing(true);
    setNotice(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as CardsResponse & { throttled?: boolean; retryInSeconds?: number };
      setData(body);
      if (body.throttled)
        setNotice(`Refreshed recently. Showing cached data (next live refresh in ~${Math.ceil((body.retryInSeconds ?? 0) / 60)} min).`);
    } catch (e) {
      setNotice(`Refresh failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setRefreshing(false);
      setNow(Date.now());
    }
  }

  const sets = useMemo(() => {
    const m = new Map<string, string>();
    data.cards.forEach((c) => m.set(c.setId, c.setName));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data.cards]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lo = minPrice ? Number(minPrice) : undefined;
    const hi = maxPrice ? Number(maxPrice) : undefined;
    const filtered = data.cards.filter((c) => {
      if (q && !`${c.name} ${c.setName} ${c.number}`.toLowerCase().includes(q)) return false;
      if (tiers.size && !tiers.has(c.recommendation.tier)) return false;
      if (setFilter !== "all" && c.setId !== setFilter) return false;
      if (rarity !== "all" && c.rarity !== rarity) return false;
      if (lo !== undefined && (c.psa10Price ?? -1) < lo) return false;
      if (hi !== undefined && (c.psa10Price ?? Infinity) > hi) return false;
      if (watchedOnly && !watch.ids.has(c.id)) return false;
      return true;
    });
    const val = (c: ScoredCard): number | string | undefined =>
      ({
        score: c.recommendation.score,
        price: c.psa10Price,
        pop: c.psa10Pop,
        cap: c.psa10MarketCap,
        set: c.setName,
      })[sort.key];
    return filtered.sort((a, b) => cmp(val(a), val(b), sort.dir));
  }, [data.cards, query, tiers, setFilter, rarity, minPrice, maxPrice, watchedOnly, watch.ids, sort]);

  const counts = useMemo(() => {
    const m: Record<Tier, number> = { "Strong Buy": 0, Buy: 0, Watch: 0, Avoid: 0 };
    data.cards.forEach((c) => m[c.recommendation.tier]++);
    return m;
  }, [data.cards]);

  const selected = data.cards.find((c) => c.id === selectedId) ?? null;
  const liveCount = data.providers.filter((p) => p.enabled && p.name !== "Bundled snapshot").length;

  const toggleTier = (t: Tier) =>
    setTiers((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "set" ? 1 : -1 }));

  const inputCls =
    "rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">ValueIR</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            PSA 10 Illustration Rare buy signals ·{" "}
            <span title={new Date(data.generatedAt).toLocaleString()}>
              updated {timeAgo(data.generatedAt, now)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            <svg
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <ThemeToggle />
        </div>
      </header>

      {notice && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {notice}
        </p>
      )}

      {liveCount <= 1 && (
        <p className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
          Most PSA 10 prices and pops are <b>snapshot estimates</b> (amber dot). Add free API keys to get live data;
          see the README.
        </p>
      )}

      {/* Tier summary doubles as a quick filter */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIERS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTier(t)}
            className={`rounded-xl border p-3 text-left transition ${
              tiers.has(t)
                ? "border-zinc-900 dark:border-zinc-100"
                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            } bg-white dark:bg-zinc-900`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${TIER_STYLES[t].split(" ")[0]}`} />
            <div className="mt-1 text-2xl font-semibold tabular">{counts[t]}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{t}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards…"
          className={`${inputCls} w-full sm:w-48`}
        />
        <select value={setFilter} onChange={(e) => setSetFilter(e.target.value)} className={inputCls}>
          <option value="all">All sets</option>
          {sets.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={inputCls}>
          <option value="all">IR + SIR</option>
          <option value="IR">IR only</option>
          <option value="SIR">SIR only</option>
        </select>
        <div className="flex items-center gap-1">
          <input
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="$ min"
            className={`${inputCls} w-20`}
          />
          <span className="text-zinc-400">–</span>
          <input
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="$ max"
            className={`${inputCls} w-20`}
          />
        </div>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={watchedOnly} onChange={(e) => setWatchedOnly(e.target.checked)} />
          Watched ({watch.ids.size})
        </label>
        <select
          value={sort.key}
          onChange={(e) => sortBy(e.target.value as SortKey)}
          className={`${inputCls} ml-auto md:hidden`}
          aria-label="Sort by"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {rows.length} of {data.cards.length} cards
      </p>

      {/* Desktop table */}
      <div className="mt-2 hidden overflow-hidden rounded-xl border border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2">Card</th>
              <Th label="Set" k="set" sort={sort} onSort={sortBy} />
              <th className="px-3 py-2">Rarity</th>
              <Th label="PSA 10" k="price" sort={sort} onSort={sortBy} right />
              <Th label="Pop" k="pop" sort={sort} onSort={sortBy} right />
              <Th label="Efficiency" k="cap" sort={sort} onSort={sortBy} right title="PSA 10 market cap = price × pop. Lower is better." />
              <th className="px-3 py-2 text-right">Set str.</th>
              <Th label="Recommendation" k="score" sort={sort} onSort={sortBy} />
              <th className="px-3 py-2 text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
              >
                <td className="px-3 py-2">
                  <Star on={watch.ids.has(c.id)} onClick={() => watch.toggle(c.id)} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Thumb card={c} />
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">#{c.number}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{c.setName}</td>
                <td className="px-3 py-2">
                  <RarityTag rarity={c.rarity} />
                </td>
                <td className="px-3 py-2 text-right tabular">
                  <span className="inline-flex items-center gap-1.5">
                    <SourceDot source={c.sources.price} />
                    {fmtUsd(c.psa10Price)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular">
                  <span className="inline-flex items-center gap-1.5">
                    <SourceDot source={c.sources.pop} />
                    {fmtNum(c.psa10Pop)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular">{fmtCap(c.psa10MarketCap)}</td>
                <td className="px-3 py-2 text-right tabular">{c.setStrength}</td>
                <td className="px-3 py-2">
                  <TierBadge tier={c.recommendation.tier} score={c.recommendation.score} />
                  <div className="mt-1 max-w-64 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {c.recommendation.reasons[0]}
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-xs text-zinc-500 dark:text-zinc-400">
                  {timeAgo(c.lastUpdated, now)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty />}
      </div>

      {/* Mobile cards */}
      <div className="mt-2 grid gap-2 md:hidden">
        {rows.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Thumb card={c} large />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {c.setName} #{c.number} · <RarityTag rarity={c.rarity} />
                  </div>
                </div>
                <Star on={watch.ids.has(c.id)} onClick={() => watch.toggle(c.id)} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular">
                <span className="inline-flex items-center gap-1">
                  <SourceDot source={c.sources.price} />
                  {fmtUsd(c.psa10Price)}
                </span>
                <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                  <SourceDot source={c.sources.pop} />
                  pop {fmtNum(c.psa10Pop)}
                </span>
              </div>
              <div className="mt-2">
                <TierBadge tier={c.recommendation.tier} score={c.recommendation.score} />
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{c.recommendation.reasons[0]}</p>
            </div>
          </div>
        ))}
        {!rows.length && <Empty />}
      </div>

      {/* Data sources */}
      <details className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        <summary className="cursor-pointer select-none">Data sources</summary>
        <ul className="mt-2 space-y-1">
          {data.providers.map((p) => (
            <li key={p.name} className="flex gap-2">
              <span className={p.enabled ? "text-emerald-600" : "text-zinc-400"}>{p.enabled ? "●" : "○"}</span>
              <span>
                <b className="font-medium text-zinc-800 dark:text-zinc-200">{p.name}</b>: {p.note}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs">
          Dots next to values: <span className="text-emerald-600">●</span> live ·{" "}
          <span className="text-amber-500">●</span> snapshot estimate · <span className="text-zinc-400">●</span> missing.
          Not financial advice.
        </p>
      </details>

      {selected && (
        <CardDetail
          card={selected}
          watched={watch.ids.has(selected.id)}
          onToggleWatch={() => watch.toggle(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </main>
  );
}

function Th({
  label,
  k,
  sort,
  onSort,
  right,
  title,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
  right?: boolean;
  title?: string;
}) {
  const active = sort.key === k;
  return (
    <th className={`px-3 py-2 ${right ? "text-right" : ""}`} title={title}>
      <button onClick={() => onSort(k)} className={`uppercase hover:text-zinc-900 dark:hover:text-zinc-100 ${active ? "text-zinc-900 dark:text-zinc-100" : ""}`}>
        {label}
        {active && (sort.dir === -1 ? " ↓" : " ↑")}
      </button>
    </th>
  );
}

function Star({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={on ? "Remove from watchlist" : "Add to watchlist"}
      className={`text-lg leading-none ${on ? "text-amber-400" : "text-zinc-300 hover:text-zinc-500 dark:text-zinc-600"}`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}

function Thumb({ card, large }: { card: ScoredCard; large?: boolean }) {
  const cls = large ? "h-24 w-[68px]" : "h-12 w-[34px]";
  if (!card.imageUrl) return <div className={`${cls} shrink-0 rounded bg-zinc-200 dark:bg-zinc-800`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={card.imageUrl} alt="" loading="lazy" className={`${cls} shrink-0 rounded object-cover`} />;
}

function Empty() {
  return <p className="p-6 text-center text-sm text-zinc-500">No cards match these filters.</p>;
}
