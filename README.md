# ValueIR

A small personal decision tool that ranks Pokémon **Illustration Rare (IR)** and **Special Illustration Rare (SIR)** cards in **PSA 10** and gives each one a daily **Strong Buy / Buy / Watch / Avoid** call, with the reasoning shown.

Built with Next.js (App Router), TypeScript and Tailwind. There is no database and no separate backend. It deploys to Vercel as is.

> Not financial advice. Always check current comps before buying.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add free API keys
npm run dev                  # http://localhost:3000
```

Deploy: push to GitHub, import the repo in Vercel, and add the same environment variables there.

---

## Data sources (all free)

There is no free API that provides **both** PSA 10 sold prices and PSA population in one clean feed. Those exist only on paid APIs such as PokeInvest and Scrydex. So ValueIR combines free sources and records the source of every value:

| Field | Source (priority order) | Cost | Key |
|---|---|---|---|
| PSA 10 price (+ sales count) | PokemonPriceTracker → snapshot | Free tier, 100 credits/day | `POKEMONPRICETRACKER_API_KEY` |
| PSA 10 pop, total graded (gem rate) | PSA Public API → snapshot | Free with a PSA account | `PSA_API_TOKEN` |
| Raw price, card image | PokemonPriceTracker → TCGdex → snapshot | Free, TCGdex needs no key | none |
| Everything (fallback) | Bundled snapshot in `src/data/cards.ts` | — | — |

In the UI, every price and pop has a dot next to it: **green = live**, **amber = snapshot estimate**, **grey = missing**. The *Data sources* panel at the bottom shows which providers are active.

### Getting the free keys

1. **PSA Public API.** Sign in at <https://www.psacard.com/publicapi>, generate an access token, and set `PSA_API_TOKEN`. The free quota is roughly 100 calls a day, and population is cached for 24h. Population is looked up by **spec id**, so add `psaSpecId` to each card you want live pop for. The spec id is in the URL of the card's PSA pop report page.
2. **PokemonPriceTracker.** Create a free account at <https://www.pokemonpricetracker.com/api> and set `POKEMONPRICETRACKER_API_KEY`. **Caveat:** PSA graded (eBay sold) data appears to be limited to paid plans (from $9.99/mo). On the free tier you may get only raw prices. In that case the card's warnings say so and the snapshot PSA 10 price is used. The response parser is defensive, but it hasn't been tested against a live key yet, so check the warnings in the card detail view the first time you run it.
3. **TCGdex.** Needs nothing. <https://tcgdex.dev>

### The snapshot (important)

`src/data/cards.ts` ships with **approximate seed values** for PSA 10 price, pop and raw price, dated `SNAPSHOT_AS_OF`. They let the app work with zero setup, but they **are not live and will drift**. Either configure the providers above, or update the numbers by hand from time to time (eBay sold / 130point for price, the PSA pop report for pop). The detail view links to all of these.

### Caching and refresh

- All upstream data is cached for **12h** (`MARKET_REVALIDATE_SECONDS`) through the Next.js data cache, so opening the page costs no API calls.
- **Refresh** invalidates the cache and re-fetches. It is throttled to once every **10 min** (`REFRESH_MIN_INTERVAL_SECONDS`) to protect free daily quotas. With about 28 cards, each live refresh uses about 28 calls per provider.
- Scoring runs on every request, so editing weights takes effect immediately.

---

## How the scoring works

All of the logic is in **`src/lib/scoring.ts`**, and every knob is at the top of the file.

Each factor maps one input onto a **0–100** score using a **log-scale ramp** between a "good" end (100) and a "bad" end (0). Log scale is used because $30→$60 should matter about as much as $300→$600.

| Factor | Weight | Input | 100 at | 0 at |
|---|---|---|---|---|
| Price level | 30% | PSA 10 price | ≤ $30 | ≥ $1,000 |
| PSA 10 scarcity | 25% | PSA 10 pop | ≤ 500 | ≥ 20,000 |
| Price-to-pop efficiency | 20% | **PSA 10 market cap** = price × pop | ≤ $50k | ≥ $5M |
| Set strength | 15% | `strength` (1–10) in `src/data/sets.ts` | 10 | 0 |
| Graded premium | 10% | PSA 10 price ÷ raw price | ≤ 2× | ≥ 10× |

- **Final score** = weighted average of the factors that have data. If an input is missing, that factor's weight is dropped and the rest are renormalised.
- **Confidence** = the share of total weight that had real data. Below **60%** a card is capped at *Watch*, because there isn't enough data to act on.
- **Tiers:** Strong Buy ≥ 68 · Buy ≥ 55 · Watch ≥ 40 · Avoid < 40 (`TIER_THRESHOLDS`).
- **Reasons:** the top two positive factors, the weakest factor if it scores below 40, and flags for thin sales (fewer than 3) or capped confidence.

Why it is set up this way: a cheap card from a strong set can be a Buy even with a high pop. Low downside plus steady demand is the "very cheap cards are still worth buying" rule. An expensive, high-pop chase card needs exceptional scarcity or set strength to score well.

**To tweak:** change `WEIGHTS` (they don't need to sum to 1), the `RAMPS` endpoints, or `TIER_THRESHOLDS`. Set strengths live in `src/data/sets.ts`.

---

## Adding cards

Edit `src/data/cards.ts`:

```ts
card("sv08", "238", "Pikachu ex", "SIR",
  { price: 350, pop: 9000, raw: 150 },           // snapshot fallback (optional)
  { psaSpecId: 1234567, tcgplayerId: 567890 }),  // optional live-lookup ids
```

- `setId` must exist in `src/data/sets.ts`. Add new sets there with a 1–10 strength.
- `tcgdexId` defaults to `<setId>-<number>`, for example `sv03.5-199`. If TCGdex returns a card with a different name, the response is ignored and a warning appears in the detail view. That's how a wrong number gets caught.
- `psaSpecId` turns on live PSA pop for the card. `tcgplayerId` makes the PokemonPriceTracker lookup exact; otherwise the lookup is a name + number search.

---

## Swapping or adding data providers

Providers live in `src/lib/providers/`. Each one implements a single interface:

```ts
interface MarketProvider {
  id: DataSource; label: string;
  enabled(): boolean;            // e.g. API key present
  note(): string;                // shown in the UI
  fetchCard(card: CuratedCard): Promise<{ data: ProviderData; warnings: string[] }>;
}
```

`src/lib/providers/index.ts` holds a `PROVIDERS` array in **priority order**. For each field (price, pop, raw, image), the first provider that returns a value wins. To switch sources:

- **PokeInvest / Scrydex (paid, both price and pop):** add `pokeinvest.ts` that calls their price and `/api/population/{id}` endpoints with `POKEINVEST_API_KEY`, then put it first in `PROVIDERS`. Add their card id to `CuratedCard` if needed. Nothing else changes.
- **PriceCharting (paid API):** a price-only provider, same pattern.
- To remove a source, delete it from the array.

Also add the provider's id to the `DataSource` union in `src/lib/types.ts` and to `SOURCE_LABEL` in `src/components/ui.tsx`.

---

## Project layout

```
src/
  app/
    page.tsx              server entry, loads cached data
    api/cards/route.ts    GET scored cards (JSON)
    api/refresh/route.ts  POST: invalidate cache + re-fetch (throttled)
  components/
    Dashboard.tsx         table / mobile cards, filters, sort, watchlist
    CardDetail.tsx        detail modal: stats, factor breakdown, comps links
    ui.tsx, ThemeToggle.tsx
  data/
    cards.ts              curated IR/SIR list + snapshot values
    sets.ts               set strength scores
  lib/
    types.ts              data model
    scoring.ts            recommendation engine (edit weights here)
    data.ts               cache + scoring glue
    providers/            tcgdex, pokemonPriceTracker, psa, snapshot, index (aggregator)
```

The watchlist and theme are stored in `localStorage`.
