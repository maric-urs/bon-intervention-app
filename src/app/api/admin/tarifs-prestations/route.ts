import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.tarifPrestation.findMany({ orderBy: [{ lot: "asc" }, { prestation: "asc" }] });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.lot || !body.prestation) {
    return NextResponse.json({ error: "Lot et prestation requis" }, { status: 400 });
  }
  const row = await prisma.tarifPrestation.create({
    data: {
      lot: body.lot,
      prestation: body.prestation,
      prixHt: Number(body.prixHt) || 0,
      remisePct: Number(body.remisePct) || 0,
      prixRemiseHt: Number(body.prixRemiseHt) || 0,
    },
  });
  return NextResponse.json(row);
}
