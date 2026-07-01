import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupPrixPneu } from "@/lib/bon-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ immat: string }> }) {
  const { immat } = await params;
  const lot = req.nextUrl.searchParams.get("lot") || "Lot 1";
  const vehicles = await prisma.vehicle.findMany({
    where: { immatriculation: decodeURIComponent(immat) },
    orderBy: { emplacement: "asc" },
  });

  const lines = await Promise.all(
    vehicles.map(async (v) => {
      const tarif = await lookupPrixPneu(lot, v.cleTarif, v.dimension);
      return {
        emplacement: v.emplacement,
        dimension: v.dimension,
        cleTarif: v.cleTarif,
        prixUnitHt: tarif?.prixNeufRemiseHt ?? null,
        refBpu: tarif?.refBpu ?? null,
      };
    })
  );

  return NextResponse.json(lines);
}
