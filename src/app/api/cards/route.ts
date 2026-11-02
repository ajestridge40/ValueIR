import { NextResponse } from "next/server";
import { getCardsData } from "@/lib/data";

export async function GET() {
  return NextResponse.json(await getCardsData());
}
