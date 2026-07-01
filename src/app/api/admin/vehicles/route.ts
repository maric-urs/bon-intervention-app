import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normCleTarif, suggestLot } from "@/lib/tarif-utils";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const rows = await prisma.vehicle.findMany({
    where: q
      ? {
          OR: [
            { immatriculation: { contains: q } },
            { marque: { contains: q } },
            { modele: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ immatriculation: "asc" }, { emplacement: "asc" }],
    take: 500,
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.immatriculation || !body.marque || !body.modele || !body.dimension) {
    return NextResponse.json({ error: "Immat, marque, modèle et dimension requis" }, { status: 400 });
  }

  const cleTarif = body.cleTarif || normCleTarif(body.dimension);
  const lotSuggere = body.lotSuggere || suggestLot(body.dimension, body.modele);
  const emplacements: string[] = body.emplacements?.length ? body.emplacements : ["AVANT", "ARRIERE"];

  const created = await prisma.$transaction(
    emplacements.map((emplacement: string) =>
      prisma.vehicle.upsert({
        where: {
          immatriculation_emplacement: {
            immatriculation: body.immatriculation.trim(),
            emplacement,
          },
        },
        create: {
          immatriculation: body.immatriculation.trim(),
          marque: body.marque.trim(),
          modele: body.modele.trim(),
          emplacement,
          dimension: body.dimension.trim(),
          lotSuggere,
          cleTarif,
        },
        update: {
          marque: body.marque.trim(),
          modele: body.modele.trim(),
          dimension: body.dimension.trim(),
          lotSuggere,
          cleTarif,
        },
      })
    )
  );

  return NextResponse.json(created);
}
