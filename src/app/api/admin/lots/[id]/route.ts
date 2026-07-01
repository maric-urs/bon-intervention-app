import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const code = body.code?.trim();

  if (code) {
    const dup = await prisma.lot.findFirst({
      where: { code, NOT: { id: Number(id) } },
    });
    if (dup) return NextResponse.json({ error: "Code lot déjà utilisé" }, { status: 400 });
  }

  const row = await prisma.lot.update({
    where: { id: Number(id) },
    data: {
      code: code || undefined,
      description: body.description !== undefined ? body.description?.trim() || null : undefined,
      ordre: body.ordre !== undefined ? Number(body.ordre) : undefined,
      actif: body.actif !== undefined ? Boolean(body.actif) : undefined,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await prisma.lot.findUnique({ where: { id: Number(id) } });
  if (!lot) return NextResponse.json({ error: "Lot introuvable" }, { status: 404 });

  const used =
    (await prisma.bonIntervention.count({ where: { lot: lot.code } })) +
    (await prisma.tarifPneu.count({ where: { lot: lot.code } })) +
    (await prisma.vehicle.count({ where: { lotSuggere: lot.code } }));

  if (used > 0) {
    const row = await prisma.lot.update({
      where: { id: lot.id },
      data: { actif: false },
    });
    return NextResponse.json({ ...row, deactivated: true });
  }

  await prisma.lot.delete({ where: { id: lot.id } });
  return NextResponse.json({ ok: true });
}
