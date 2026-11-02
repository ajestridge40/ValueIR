import type { CuratedCard, Rarity } from "@/lib/types";

/**
 * Curated watch universe of modern IR/SIR cards.
 *
 * HOW TO ADD A CARD
 *   1. Add the set to src/data/sets.ts if it is new.
 *   2. Add an entry below with name, setId, number and rarity.
 *   3. tcgdexId is "<tcgdex set id>-<card number>" (e.g. "sv03.5-199"). Check it at
 *      https://api.tcgdex.net/v2/en/cards/<id>. If TCGdex returns a card with a
 *      different name, the app ignores that response and shows a warning.
 *   4. Optional: add tcgplayerId (exact price lookup) and psaSpecId (live PSA pop).
 *   5. Optional: fill the snapshot values so the card is useful even with no API keys.
 *
 * SNAPSHOT VALUES ARE APPROXIMATE SEED ESTIMATES, NOT LIVE DATA. They exist so
 * the app works with zero configuration. The UI labels every value with its
 * source. Replace them with real numbers, or configure the live providers.
 */
const SNAPSHOT_AS_OF = "2025-10-01";

function card(
  setId: string,
  number: string,
  name: string,
  rarity: Rarity,
  snap: { price?: number; pop?: number; raw?: number },
  extra: Partial<Pick<CuratedCard, "tcgplayerId" | "psaSpecId" | "tcgdexId">> = {},
): CuratedCard {
  return {
    id: `${setId}-${number}`,
    name,
    setId,
    number,
    rarity,
    tcgdexId: extra.tcgdexId ?? `${setId}-${number}`,
    tcgplayerId: extra.tcgplayerId,
    psaSpecId: extra.psaSpecId,
    snapshot: {
      psa10Price: snap.price,
      psa10Pop: snap.pop,
      rawPrice: snap.raw,
      asOf: SNAPSHOT_AS_OF,
    },
  };
}

export const CARDS: CuratedCard[] = [
  // 151
  card("sv03.5", "199", "Charizard ex", "SIR", { price: 450, pop: 22000, raw: 180 }),
  card("sv03.5", "200", "Blastoise ex", "SIR", { price: 180, pop: 9000, raw: 70 }),
  card("sv03.5", "198", "Venusaur ex", "SIR", { price: 160, pop: 8000, raw: 60 }),
  card("sv03.5", "203", "Erika's Invitation", "SIR", { price: 200, pop: 5000, raw: 80 }),
  card("sv03.5", "201", "Alakazam ex", "SIR", { price: 90, pop: 5000, raw: 30 }),
  card("sv03.5", "202", "Zapdos ex", "SIR", { price: 70, pop: 4000, raw: 25 }),
  card("sv03.5", "168", "Charmander", "IR", { price: 120, pop: 9000, raw: 30 }),
  card("sv03.5", "170", "Squirtle", "IR", { price: 90, pop: 8000, raw: 25 }),
  card("sv03.5", "166", "Bulbasaur", "IR", { price: 80, pop: 7500, raw: 20 }),
  card("sv03.5", "175", "Psyduck", "IR", { price: 50, pop: 4000, raw: 12 }),
  card("sv03.5", "181", "Dragonair", "IR", { price: 55, pop: 4000, raw: 15 }),

  // Scarlet & Violet base
  card("sv01", "245", "Gardevoir ex", "SIR", { price: 90, pop: 4000, raw: 30 }),
  card("sv01", "244", "Miraidon ex", "SIR", { price: 60, pop: 2500, raw: 20 }),

  // Paldea Evolved
  card("sv02", "203", "Magikarp", "IR", { price: 300, pop: 9000, raw: 90 }),
  card("sv02", "269", "Iono", "SIR", { price: 180, pop: 7000, raw: 70 }),

  // Obsidian Flames
  card("sv03", "223", "Charizard ex", "SIR", { price: 160, pop: 9000, raw: 60 }),

  // Paradox Rift
  card("sv04", "251", "Roaring Moon ex", "SIR", { price: 100, pop: 3000, raw: 35 }),

  // Paldean Fates
  card("sv04.5", "232", "Mew ex", "SIR", { price: 120, pop: 6000, raw: 40 }),
  card("sv04.5", "234", "Charizard ex", "SIR", { price: 250, pop: 9000, raw: 90 }),

  // Temporal Forces
  card("sv05", "205", "Walking Wake ex", "SIR", { price: 70, pop: 2000, raw: 25 }),

  // Twilight Masquerade
  card("sv06", "214", "Greninja ex", "SIR", { price: 200, pop: 4500, raw: 80 }),

  // Stellar Crown
  card("sv07", "170", "Terapagos ex", "SIR", { price: 90, pop: 2500, raw: 30 }),

  // Surging Sparks
  card("sv08", "238", "Pikachu ex", "SIR", { price: 350, pop: 9000, raw: 150 }),
  card("sv08", "239", "Latias ex", "SIR", { price: 90, pop: 3000, raw: 35 }),

  // Prismatic Evolutions
  card("sv08.5", "161", "Umbreon ex", "SIR", { price: 1600, pop: 6000, raw: 1000 }),
  card("sv08.5", "156", "Sylveon ex", "SIR", { price: 350, pop: 4000, raw: 150 }),
  card("sv08.5", "155", "Espeon ex", "SIR", { price: 400, pop: 3000, raw: 180 }),

  // Destined Rivals
  card("sv10", "231", "Team Rocket's Mewtwo ex", "SIR", { price: 400, pop: 2500, raw: 180 }),
];
