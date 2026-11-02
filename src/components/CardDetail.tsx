"use client";

import { useEffect } from "react";
import type { ScoredCard } from "@/lib/types";
import { RarityTag, SourceDot, TierBadge, fmtCap, fmtNum, fmtUsd, sourceLabel } from "./ui";

export default function CardDetail({
  card,
  watched,
  onToggleWatch,
  onClose,
}: {
  card: ScoredCard;
  watched: boolean;
  onToggleWatch: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const r = card.recommendation;
  const q = encodeURIComponent(`${card.name} ${card.number} ${card.setName} PSA 10`);

  const stats: { label: string; value: string; source?: ScoredCard["sources"]["price"] }[] = [
    { label: "PSA 10 price", value: fmtUsd(card.psa10Price), source: card.sources.price },
    { label: "PSA 10 pop", value: fmtNum(card.psa10Pop), source: card.sources.pop },
    { label: "Gem rate", value: card.gemRate !== undefined ? `${(card.gemRate * 100).toFixed(0)}%` : "—" },
    { label: "Raw price", value: fmtUsd(card.rawPrice), source: card.sources.raw },
    { label: "Graded multiple", value: card.gradedMultiple ? `${card.gradedMultiple.toFixed(1)}×` : "—" },
    { label: "PSA 10 cap", value: fmtCap(card.psa10MarketCap) },
    { label: "Recent sales", value: card.psa10SalesCount !== undefined ? fmtNum(card.psa10SalesCount) : "—" },
    { label: "Set strength", value: `${card.setStrength}/10` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{card.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {card.setName} · #{card.number} · <RarityTag rarity={card.rarity} />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleWatch}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm dark:border-zinc-700"
            >
              {watched ? "★ Watching" : "☆ Watch"}
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-xl leading-none text-zinc-500">
              ×
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row">
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.imageUrl} alt={card.name} className="mx-auto w-44 shrink-0 self-start rounded-lg shadow" />
          ) : (
            <div className="mx-auto h-60 w-44 shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <TierBadge tier={r.tier} />
              <span className="text-2xl font-bold tabular">{r.score}</span>
              <span className="text-xs text-zinc-500">/ 100 · {(r.confidence * 100).toFixed(0)}% data coverage</span>
            </div>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
              {r.reasons.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-1 dark:border-zinc-800">
                  <dt className="text-zinc-500 dark:text-zinc-400">{s.label}</dt>
                  <dd className="flex items-center gap-1.5 font-medium tabular" title={s.source ? sourceLabel(s.source) : undefined}>
                    {s.source && <SourceDot source={s.source} />}
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <h3 className="mt-6 text-sm font-semibold">Why it scored this way</h3>
        <div className="mt-2 space-y-2">
          {r.factors.map((f) => (
            <div key={f.key} className="text-sm">
              <div className="flex justify-between gap-2">
                <span>
                  {f.label} <span className="text-xs text-zinc-500">({Math.round(f.weight * 100)}% weight)</span>
                </span>
                <span className="tabular text-zinc-600 dark:text-zinc-300">
                  {f.display} · <b>{f.score ?? "n/a"}</b>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${
                    f.score === null ? "" : f.score >= 60 ? "bg-emerald-500" : f.score >= 40 ? "bg-amber-400" : "bg-rose-500"
                  }`}
                  style={{ width: `${f.score ?? 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-sm font-semibold">Recent sales context</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Price source: {sourceLabel(card.sources.price)}
          {card.psa10SalesCount !== undefined && `, median of ${card.psa10SalesCount} recent sales`}. Check the latest
          comps before buying:
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {[
            ["eBay sold", `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`],
            ["130point", `https://130point.com/sales/?search=${q}`],
            ["PSA pop report", `https://www.psacard.com/pop/search?q=${encodeURIComponent(`${card.name} ${card.number}`)}`],
            ["TCGplayer", `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(`${card.name} ${card.number}`)}`],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-200 px-2.5 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {label} ↗
            </a>
          ))}
        </div>

        {card.warnings.length > 0 && (
          <details className="mt-5 text-xs text-zinc-500">
            <summary className="cursor-pointer">Data warnings ({card.warnings.length})</summary>
            <ul className="mt-1 list-disc pl-5">
              {card.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
