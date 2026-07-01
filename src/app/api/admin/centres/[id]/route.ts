import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function lotLabelFromCouvert(lotsCouvert: string): string {
  const codes = lotsCouvert
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
  if (codes.length === 2 && codes[0] === "Lot 1" && codes[1] === "Lot 2") return "Lot 1-2";
  if (codes.length === 1) return codes[0];
  return codes.join(" + ");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const centreId = Number(id);

  if (body.nom) {
    const dup = await prisma.centre.findFirst({
      where: { nom: String(body.nom).trim(), NOT: { id: centreId } },
    });
    if (dup) return NextResponse.json({ error: "Ce nom est déjà utilisé" }, { status: 400 });
  }

  const lotsCouvert =
    body.lotsCouvert !== undefined ? String(body.lotsCouvert || "").trim() || null : undefined;

  const row = await prisma.centre.update({
    where: { id: centreId },
    data: {
      nom: body.nom?.trim(),
      adresse: body.adresse?.trim(),
      email: body.email?.trim(),
      mobile: body.mobile !== undefined ? body.mobile?.trim() || null : undefined,
      fixe: body.fixe !== undefined ? body.fixe?.trim() || null : undefined,
      emailCc: body.emailCc !== undefined ? body.emailCc?.trim() || null : undefined,
      lotsCouvert,
      lot:
        lotsCouvert !== undefined
          ? lotLabelFromCouvert(lotsCouvert || "")
          : body.lot?.trim() || undefined,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const centreId = Number(id);
  const used = await prisma.bonIntervention.count({ where: { centreId } });
  if (used > 0) {
    return NextResponse.json(
      { error: `Impossible : ${used} bon(s) lié(s) à ce prestataire` },
      { status: 400 }
    );
  }
  await prisma.centre.delete({ where: { id: centreId } });
  return NextResponse.json({ ok: true });
}
