import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMarcheConfig } from "@/lib/marche";
import { buildMailtoUrl, generateNumeroBon } from "@/lib/utils";

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
            commentaire: body.markEnvoye ? "Création + ouverture Outlook" : "Création du bon",
          },
        },
      },
      include: { centre: true, lignes: true },
    });

    let mailto: string | undefined;
    if (body.markEnvoye) {
      const text = buildEmailBody(bon, marche.reference);
      mailto = buildMailtoUrl({
        to: centre.email,
        cc: centre.emailCc || "lbarru@citadelle-sa.com",
        subject: `Bon d'intervention ${bon.numeroBon} - Marché ${marche.reference} - ${bon.immatriculation}`,
        body: text,
      });
    }

    return NextResponse.json({ id: bon.id, mailto });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function buildEmailBody(
  bon: {
    numeroBon: string;
    numeroEngagement: string | null;
    lot: string;
    centre: { nom: string };
    dateBon: Date;
    immatriculation: string;
    marque: string;
    modele: string;
    kilometrage: number | null;
    demandeur: string | null;
    totalHt: number;
    lignes: Array<{
      type: string;
      prestation: string | null;
      emplacement: string;
      dimension: string;
      quantite: number;
      prixUnitHt: number | null;
      totalHt: number | null;
    }>;
  },
  marcheRef: string
) {  let t = `Bonjour,\n\nVeuillez trouver ci-dessous notre bon d'intervention (marché CACEM ${marcheRef}).\n\n`;
  t += `N° bon : ${bon.numeroBon}\n`;
  t += `N° engagement : ${bon.numeroEngagement || ""}\n`;
  t += `Lot : ${bon.lot}\n`;
  t += `Centre : ${bon.centre.nom}\n`;
  t += `Immatriculation : ${bon.immatriculation}\n`;
  t += `Véhicule : ${bon.marque} ${bon.modele}\n`;
  t += `Kilométrage : ${bon.kilometrage ?? ""}\n\n`;
  t += "PRESTATIONS :\n";
  for (const l of bon.lignes) {
    if (l.prestation) {
      t += `- ${l.prestation} | ${l.prixUnitHt ?? 0} EUR HT\n`;
    } else {
      t += `- ${l.emplacement} | ${l.dimension} | ${l.prixUnitHt ?? 0} EUR HT\n`;
    }
  }
  t += `\nTOTAL HT : ${bon.totalHt.toFixed(2)} EUR\n\n`;
  t += "À faire figurer sur la facture : immatriculation, n° engagement, n° bon.\n\n";
  if (bon.demandeur) t += `Cordialement,\n${bon.demandeur}`;
  return t;
}
