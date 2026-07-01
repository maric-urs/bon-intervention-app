import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuro, STATUT_LABELS, STATUT_COLORS, buildMailtoUrl, type Statut } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import { BonStatusPanel } from "@/components/bon-status-panel";

export const dynamic = "force-dynamic";

export default async function BonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bon = await prisma.bonIntervention.findUnique({
    where: { id: Number(id) },
    include: { centre: true, lignes: { orderBy: { ordre: "asc" } }, historique: { orderBy: { createdAt: "desc" } } },
  });
  if (!bon) notFound();

  const mailBody = buildMail(bon);
  const mailto = buildMailtoUrl({
    to: bon.centre.email,
    cc: bon.centre.emailCc || "lbarru@citadelle-sa.com",
    subject: `Bon d'intervention ${bon.numeroBon} - Marché 25.061 - ${bon.immatriculation}`,
    body: mailBody,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Retour au suivi
          </Link>
          <h1 className="text-3xl font-bold mt-2 font-mono">{bon.numeroBon}</h1>
          <p className="text-muted-foreground">
            {bon.immatriculation} — {bon.marque} {bon.modele}
          </p>
        </div>
        <Badge className={STATUT_COLORS[bon.statut as Statut] || ""}>
          {STATUT_LABELS[bon.statut as Statut] || bon.statut}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Détail</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Date</span><div>{formatDate(bon.dateBon)}</div></div>
            <div><span className="text-muted-foreground">Marché</span><div>{bon.marche}</div></div>
            <div><span className="text-muted-foreground">Lot</span><div>{bon.lot}</div></div>
            <div><span className="text-muted-foreground">Engagement</span><div>{bon.numeroEngagement || "—"}</div></div>
            <div><span className="text-muted-foreground">Centre</span><div>{bon.centre.nom}</div></div>
            <div><span className="text-muted-foreground">Kilométrage</span><div>{bon.kilometrage ?? "—"}</div></div>
            <div className="sm:col-span-2"><span className="text-muted-foreground">Demandeur</span><div>{bon.demandeur || "—"}</div></div>
          </CardContent>
        </Card>

        <BonStatusPanel bonId={bon.id} currentStatut={bon.statut} mailto={mailto} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lignes de prestation</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Emp.</th>
                <th className="pb-2 pr-4">Dimension</th>
                <th className="pb-2 pr-4">Qté</th>
                <th className="pb-2 pr-4 text-right">Prix unit.</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {bon.lignes.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{l.emplacement}</td>
                  <td className="py-2 pr-4">{l.dimension}</td>
                  <td className="py-2 pr-4">{l.quantite}</td>
                  <td className="py-2 pr-4 text-right">{formatEuro(l.prixUnitHt)}</td>
                  <td className="py-2 text-right">{formatEuro(l.totalHt)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-4 text-right font-semibold">Total HT</td>
                <td className="pt-4 text-right font-semibold">{formatEuro(bon.totalHt)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique / suivi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bon.historique.map((h) => (
            <div key={h.id} className="flex gap-3 text-sm border-l-2 border-primary/30 pl-3">
              <div className="text-muted-foreground whitespace-nowrap">{formatDate(h.createdAt)}</div>
              <div>
                <span className="font-medium">{STATUT_LABELS[h.statut as Statut] || h.statut}</span>
                {h.commentaire && <span className="text-muted-foreground"> — {h.commentaire}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function buildMail(bon: {
  numeroBon: string;
  numeroEngagement: string | null;
  lot: string;
  centre: { nom: string };
  immatriculation: string;
  marque: string;
  modele: string;
  kilometrage: number | null;
  demandeur: string | null;
  totalHt: number;
  lignes: Array<{ emplacement: string; dimension: string; prixUnitHt: number | null }>;
}) {
  let t = "Bonjour,\n\nBon d'intervention marché CACEM 25.061.\n\n";
  t += `N° bon : ${bon.numeroBon}\nEngagement : ${bon.numeroEngagement || ""}\n`;
  t += `Lot : ${bon.lot}\nCentre : ${bon.centre.nom}\n`;
  t += `Immat : ${bon.immatriculation} (${bon.marque} ${bon.modele})\n\n`;
  for (const l of bon.lignes) {
    t += `${l.emplacement} — ${l.dimension} — ${l.prixUnitHt ?? 0} EUR HT\n`;
  }
  t += `\nTotal HT : ${bon.totalHt.toFixed(2)} EUR\n`;
  return t;
}
