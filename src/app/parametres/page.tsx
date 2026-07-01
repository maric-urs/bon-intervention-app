import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMarcheConfig } from "@/lib/marche";
import { getAllLots, getCentres } from "@/lib/lots";
import { SettingsPanel } from "@/components/settings/settings-panel";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const [marche, lots, centres, tarifsPneus, tarifsPrestations, vehicles] = await Promise.all([
    getMarcheConfig(),
    getAllLots(),
    getCentres(),
    prisma.tarifPneu.findMany({ orderBy: [{ lot: "asc" }, { refBpu: "asc" }] }),
    prisma.tarifPrestation.findMany({ orderBy: [{ lot: "asc" }, { prestation: "asc" }] }),
    prisma.vehicle.findMany({
      orderBy: [{ immatriculation: "asc" }, { emplacement: "asc" }],
      take: 500,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Retour au suivi
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Paramètres</h1>
        <p className="text-muted-foreground mt-1">
          Marché, lots, centres, tarifs BPU et flotte véhicules
        </p>
      </div>
      <SettingsPanel
        marche={marche}
        lots={lots}
        centres={centres}
        tarifsPneus={tarifsPneus}
        tarifsPrestations={tarifsPrestations}
        vehicles={vehicles}
      />
    </div>
  );
}
