import { NextResponse } from "next/server";
import { getLotsActifs } from "@/lib/lots";

export const dynamic = "force-dynamic";

export async function GET() {
  const lots = await getLotsActifs();
  return NextResponse.json(lots);
}
