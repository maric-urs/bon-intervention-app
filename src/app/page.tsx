import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuro, STATUT_LABELS, STATUT_COLORS, type Statut } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const bons = await prisma.bonIntervention.findMany({
    include: { centre: true, _count: { select: { lignes: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const stats = await prisma.bonIntervention.groupBy({
    by: ["statut"],
    _count: true,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Suivi des interventions</h1>
        <p className="text-muted-foreground mt-1">
          Flotte, tarifs BPU et centres prestataires — remplace le fichier Excel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.statut}>
            <CardHeader className="pb-2">
              <CardDescription>{STATUT_LABELS[s.statut as Statut] || s.statut}</CardDescription>
              <CardTitle className="text-3xl">{s._count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
        {stats.length === 0 && (
          <Card className="sm:col-span-2">
            <CardHeader>
              <CardDescription>Aucun bon pour l&apos;instant</CardDescription>
              <CardTitle className="text-xl">Créez votre premier bon</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/nouveau">
                <Button>Nouveau bon d&apos;intervention</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Derniers bons</CardTitle>
          <CardDescription>Historique et statuts en temps réel</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">N° bon</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Immat</th>
                <th className="pb-3 pr-4 font-medium">Centre</th>
                <th className="pb-3 pr-4 font-medium">Statut</th>
                <th className="pb-3 pr-4 font-medium text-right">Total HT</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {bons.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-3 pr-4 font-mono text-xs">{b.numeroBon}</td>
                  <td className="py-3 pr-4">{formatDate(b.dateBon)}</td>
                  <td className="py-3 pr-4">{b.immatriculation}</td>
                  <td className="py-3 pr-4">{b.centre.nom}</td>
                  <td className="py-3 pr-4">
                    <Badge className={STATUT_COLORS[b.statut as Statut] || ""}>
                      {STATUT_LABELS[b.statut as Statut] || b.statut}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-right">{formatEuro(b.totalHt)}</td>
                  <td className="py-3">
                    <Link href={`/bons/${b.id}`} className="text-primary hover:underline">
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
              {bons.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Aucun bon enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
