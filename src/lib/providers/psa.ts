import type { MarketProvider } from "./types";
import { errMsg, getJson, num } from "./http";

/**
 * PSA Public API: https://www.psacard.com/publicapi
 * Free with a PSA account (about 100 calls/day). Returns population by grade for a
 * "spec id", which you add per card as `psaSpecId` in src/data/cards.ts.
 * Population changes slowly, so it is cached for 24h.
 */
const TOKEN = () => process.env.PSA_API_TOKEN;

type Json = Record<string, unknown>;

/** Find the object that holds a Grade10 field, wherever it is nested. */
function findPop(obj: unknown, depth = 0): Json | undefined {
  if (!obj || typeof obj !== "object" || depth > 5) return undefined;
  const o = obj as Json;
  if (Object.keys(o).some((k) => /^grade10$/i.test(k))) return o;
  for (const v of Object.values(o)) {
    const hit = findPop(v, depth + 1);
    if (hit) return hit;
  }
  return undefined;
}

function field(o: Json, re: RegExp): unknown {
  const k = Object.keys(o).find((key) => re.test(key));
  return k ? o[k] : undefined;
}

export const psaProvider: MarketProvider = {
  id: "psa",
  label: "PSA Public API",
  enabled: () => Boolean(TOKEN()),
  note: () =>
    TOKEN()
      ? "Live PSA 10 population for cards that have a psaSpecId."
      : "Disabled. Set PSA_API_TOKEN (free) to enable live population.",
  async fetchCard(card) {
    if (!card.psaSpecId) return { data: {}, warnings: [] };
    try {
      const body = await getJson<Json>(
        `https://api.psacard.com/publicapi/pop/GetPSASpecPopulation/${card.psaSpecId}`,
        { headers: { Authorization: `bearer ${TOKEN()}` }, revalidate: 60 * 60 * 24 },
      );
      const pop = findPop(body);
      if (!pop) return { data: {}, warnings: ["PSA: response had no Grade10 field."] };
      return {
        data: { psa10Pop: num(field(pop, /^grade10$/i)), totalGraded: num(field(pop, /^total$/i)) },
        warnings: [],
      };
    } catch (e) {
      return { data: {}, warnings: [`PSA: ${errMsg(e)}`] };
    }
  },
};
