import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const bonId = Number(id);

  const data: { statut: string; envoyeAt?: Date } = { statut: body.statut };
  if (body.statut === "ENVOYE") data.envoyeAt = new Date();

  await prisma.$transaction([
    prisma.bonIntervention.update({
      where: { id: bonId },
      data,
    }),
    prisma.historiqueStatut.create({
      data: {
        bonId,
        statut: body.statut,
        commentaire: body.commentaire || null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
