import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.tarifPneu.findMany({ orderBy: [{ lot: "asc" }, { refBpu: "asc" }] });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.lot || !body.dimension || !body.cleRecherche) {
    return NextResponse.json({ error: "Lot, dimension et clé requis" }, { status: 400 });
  }
  const row = await prisma.tarifPneu.create({
    data: {
      lot: body.lot,
      refBpu: body.refBpu || "BPU",
      dimension: body.dimension,
      cleRecherche: body.cleRecherche,
      marque: body.marque || null,
      classification: body.classification || null,
      prixNeufHt: body.prixNeufHt ?? null,
      remisePct: body.remisePct ?? null,
      prixNeufRemiseHt: body.prixNeufRemiseHt ?? null,
      prixRechapeRemiseHt: body.prixRechapeRemiseHt ?? null,
    },
  });
  return NextResponse.json(row);
}
