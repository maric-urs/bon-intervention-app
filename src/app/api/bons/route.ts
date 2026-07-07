import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMarcheConfig } from "@/lib/marche";
import { generateNumeroBon } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const marche = await getMarcheConfig();
    const centre = await prisma.centre.findUnique({ where: { id: body.centreId } });
    if (!centre) return NextResponse.json({ error: "Centre introuvable" }, { status: 400 });
    if (!body.immatriculation) return NextResponse.json({ error: "Immatriculation requise" }, { status: 400 });

    const count = await prisma.bonIntervention.count();
    const numeroBon = generateNumeroBon(count + 1);
    const lignes = (body.lignes || []) as Array<{
      ordre: number;
      type: string;
      prestation?: string | null;
      emplacement: string;
      dimension: string;
      quantite: number;
      prixUnitHt: number | null;
      refBpu: string | null;
    }>;

    const totalHt = lignes.reduce((s, l) => s + (l.prixUnitHt || 0) * (l.quantite || 1), 0);

    const bon = await prisma.bonIntervention.create({
      data: {
        numeroBon,
        numeroEngagement: body.numeroEngagement || null,
        lot: body.lot || "Lot 1",
        marche: marche.reference,
        immatriculation: body.immatriculation,
        marque: body.marque,
        modele: body.modele,
        demandeur: body.demandeur || null,
        notes: body.notes?.trim() || null,
        kilometrage: body.kilometrage,
        centreId: centre.id,
        totalHt,
        statut: body.markEnvoye ? "ENVOYE" : "BROUILLON",
        envoyeAt: body.markEnvoye ? new Date() : null,
        lignes: {
          create: lignes.map((l) => ({
            ordre: l.ordre,
            type: l.type,
            prestation: l.prestation || null,
            emplacement: l.emplacement,
            dimension: l.dimension,
            quantite: l.quantite,
            prixUnitHt: l.prixUnitHt,
            totalHt: (l.prixUnitHt || 0) * l.quantite,
            refBpu: l.refBpu,
          })),
        },
        historique: {
          create: {
            statut: body.markEnvoye ? "ENVOYE" : "BROUILLON",
            commentaire: body.markEnvoye ? "Création + email Outlook préparé" : "Création du bon",
          },
        },
      },
      include: { centre: true, lignes: true },
    });

    return NextResponse.json({ id: bon.id, openEmail: Boolean(body.markEnvoye) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
