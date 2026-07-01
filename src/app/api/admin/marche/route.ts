import { NextRequest, NextResponse } from "next/server";
import { getMarcheConfig } from "@/lib/marche";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(await getMarcheConfig());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const config = await prisma.marcheConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      reference: body.reference || "25.061",
      consultation: body.consultation || "",
      maitreOuvrage: body.maitreOuvrage || "CACEM",
      objet: body.objet || "",
      lot1Desc: body.lot1Desc || null,
      lot2Desc: body.lot2Desc || null,
      lot3Desc: body.lot3Desc || null,
      documents: body.documents || null,
    },
    update: {
      reference: body.reference,
      consultation: body.consultation,
      maitreOuvrage: body.maitreOuvrage,
      objet: body.objet,
      lot1Desc: body.lot1Desc || null,
      lot2Desc: body.lot2Desc || null,
      lot3Desc: body.lot3Desc || null,
      documents: body.documents || null,
    },
  });
  return NextResponse.json(config);
}
