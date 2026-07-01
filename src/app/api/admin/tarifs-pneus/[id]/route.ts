import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.tarifPneu.update({
    where: { id: Number(id) },
    data: {
      lot: body.lot,
      refBpu: body.refBpu,
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.tarifPneu.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
