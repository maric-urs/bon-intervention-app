import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const row = await prisma.tarifPrestation.update({
    where: { id: Number(id) },
    data: {
      lot: body.lot,
      prestation: body.prestation,
      prixHt: Number(body.prixHt),
      remisePct: Number(body.remisePct),
      prixRemiseHt: Number(body.prixRemiseHt),
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.tarifPrestation.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
