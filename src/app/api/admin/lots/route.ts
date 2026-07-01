import { NextRequest, NextResponse } from "next/server";
import { getAllLots } from "@/lib/lots";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(await getAllLots());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const code = String(body.code || "").trim();
  if (!code) return NextResponse.json({ error: "Code lot requis (ex. Lot 4)" }, { status: 400 });

  const existing = await prisma.lot.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Ce lot existe déjà" }, { status: 400 });

  const maxOrdre = await prisma.lot.aggregate({ _max: { ordre: true } });
  const row = await prisma.lot.create({
    data: {
      code,
      description: body.description?.trim() || null,
      ordre: body.ordre ?? (maxOrdre._max.ordre ?? 0) + 1,
      actif: body.actif !== false,
    },
  });
  return NextResponse.json(row);
}
