import Dashboard from "@/components/Dashboard";
import { getCardsData } from "@/lib/data";

// Render per request; the expensive part (upstream API calls) is cached in getCardsData.
export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getCardsData();
  return <Dashboard initial={data} />;
}
