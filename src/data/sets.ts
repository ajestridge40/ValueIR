import type { SetInfo } from "@/lib/types";

/**
 * Set strength (1–10) = hand-tuned long-term desirability.
 * Rough rubric:
 *   9–10  iconic / nostalgia-driven / chase-heavy sets (151, Prismatic Evolutions)
 *   7–8   strong modern sets with multiple marquee chase cards
 *   5–6   solid sets, fewer headline cards
 *   1–4   weak demand, heavily reprinted, or very niche
 * These are opinions. Edit them to match your own view.
 */
export const SETS: Record<string, SetInfo> = {
  sv01: { id: "sv01", name: "Scarlet & Violet", releaseDate: "2023-03-31", strength: 5.5 },
  sv02: { id: "sv02", name: "Paldea Evolved", releaseDate: "2023-06-09", strength: 7 },
  sv03: { id: "sv03", name: "Obsidian Flames", releaseDate: "2023-08-11", strength: 7 },
  "sv03.5": {
    id: "sv03.5",
    name: "151",
    releaseDate: "2023-09-22",
    strength: 10,
    note: "Gen 1 nostalgia; strongest modern IR/SIR set.",
  },
  sv04: { id: "sv04", name: "Paradox Rift", releaseDate: "2023-11-03", strength: 6 },
  "sv04.5": { id: "sv04.5", name: "Paldean Fates", releaseDate: "2024-01-26", strength: 7.5 },
  sv05: { id: "sv05", name: "Temporal Forces", releaseDate: "2024-03-22", strength: 5.5 },
  sv06: { id: "sv06", name: "Twilight Masquerade", releaseDate: "2024-05-24", strength: 6.5 },
  sv07: { id: "sv07", name: "Stellar Crown", releaseDate: "2024-09-13", strength: 6 },
  sv08: { id: "sv08", name: "Surging Sparks", releaseDate: "2024-11-08", strength: 8 },
  "sv08.5": {
    id: "sv08.5",
    name: "Prismatic Evolutions",
    releaseDate: "2025-01-17",
    strength: 9.5,
    note: "Eeveelution SIRs; very high demand.",
  },
  sv10: { id: "sv10", name: "Destined Rivals", releaseDate: "2025-05-30", strength: 8 },
};

export function getSet(id: string): SetInfo {
  return SETS[id] ?? { id, name: id, releaseDate: "", strength: 5 };
}
