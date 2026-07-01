import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normCleTarif, suggestLot } from "@/lib/tarif-utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const dimension = body.dimension?.trim() ?? "";
  const row = await prisma.vehicle.update({
    where: { id: Number(id) },
    data: {
      immatriculation: body.immatriculation?.trim(),
      marque: body.marque?.trim(),
      modele: body.modele?.trim(),
      emplacement: body.emplacement,
      dimension,
      lotSuggere: body.lotSuggere || suggestLot(dimension, body.modele || ""),
      cleTarif: body.cleTarif || normCleTarif(dimension),
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.vehicle.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
