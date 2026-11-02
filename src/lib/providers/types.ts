import type { CuratedCard, DataSource } from "@/lib/types";

/** Fields a provider may fill. Every field is optional. */
export interface ProviderData {
  psa10Price?: number;
  psa10SalesCount?: number;
  psa10Pop?: number;
  totalGraded?: number;
  rawPrice?: number;
  imageUrl?: string;
}

export interface ProviderResult {
  data: ProviderData;
  warnings: string[];
}

/**
 * A market data provider. To add a new one (Scrydex, PokeInvest, PriceCharting...),
 * implement this interface and register it in ./index.ts. The aggregator takes
 * each field from the first provider (in priority order) that returns it.
 */
export interface MarketProvider {
  id: DataSource;
  label: string;
  /** True when the provider can run (e.g. its API key is set). */
  enabled(): boolean;
  /** Short human note shown in the UI's "data sources" panel. */
  note(): string;
  fetchCard(card: CuratedCard): Promise<ProviderResult>;
}
