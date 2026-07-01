import { prisma } from "@/lib/prisma";
import { getUniqueImmatriculations } from "@/lib/bon-service";
import { getLotsActifs, getCentres } from "@/lib/lots";
import { BonForm } from "@/components/bon-form";

export const dynamic = "force-dynamic";

export default async function NouveauBonPage() {
  const [centres, immats, prestations, lots] = await Promise.all([
    getCentres(),
    getUniqueImmatriculations(),
    prisma.tarifPrestation.findMany({ orderBy: { prestation: "asc" } }),
    getLotsActifs(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nouveau bon d&apos;intervention</h1>
        <p className="text-muted-foreground mt-1">Marché 25.061 — dimensions et prix BPU automatiques</p>
      </div>
      <BonForm centres={centres} immatriculations={immats} prestations={prestations} lots={lots} />
    </div>
  );
}
