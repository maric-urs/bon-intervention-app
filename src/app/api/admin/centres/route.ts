import { NextRequest, NextResponse } from "next/server";
import { getCentres } from "@/lib/lots";
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

export async function GET() {
  return NextResponse.json(await getCentres());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nom = String(body.nom || "").trim();
  const email = String(body.email || "").trim();
  const adresse = String(body.adresse || "").trim();

  if (!nom || !email || !adresse) {
    return NextResponse.json({ error: "Nom, adresse et email requis" }, { status: 400 });
  }

  const lotsCouvert = String(body.lotsCouvert || "").trim();
  if (!lotsCouvert) {
    return NextResponse.json({ error: "Sélectionnez au moins un lot" }, { status: 400 });
  }

  const existing = await prisma.centre.findUnique({ where: { nom } });
  if (existing) return NextResponse.json({ error: "Ce prestataire existe déjà" }, { status: 400 });

  const row = await prisma.centre.create({
    data: {
      nom,
      adresse,
      email,
      mobile: body.mobile?.trim() || null,
      fixe: body.fixe?.trim() || null,
      emailCc: body.emailCc?.trim() || null,
      lotsCouvert,
      lot: body.lot?.trim() || lotLabelFromCouvert(lotsCouvert),
    },
  });
  return NextResponse.json(row);
}
