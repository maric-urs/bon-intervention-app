import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type SeedData = {
  marche: { reference: string; consultation: string; maitre?: string };
  centres: Array<{
    lot: string;
    nom: string;
    adresse: string;
    email: string;
    mobile?: string;
    fixe?: string;
    emailCc?: string;
  }>;
  vehicles: Array<{
    immatriculation: string;
    marque: string;
    modele: string;
    emplacement: string;
    dimension: string;
    lotSuggere: string;
    cleTarif: string;
  }>;
  tarifsPneus: Array<Record<string, unknown>>;
  tarifsPrestations: Array<Record<string, unknown>>;
};

async function main() {
  const raw = readFileSync(join(__dirname, "seed-data.json"), "utf-8");
  const data: SeedData = JSON.parse(raw);

  await prisma.historiqueStatut.deleteMany();
  await prisma.lignePrestation.deleteMany();
  await prisma.bonIntervention.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.tarifPneu.deleteMany();
  await prisma.tarifPrestation.deleteMany();
  await prisma.centre.deleteMany();
  await prisma.lot.deleteMany();

  await prisma.lot.createMany({
    data: [
      { code: "Lot 1", description: "Pneumatiques véhicules légers et SUV — Pneu Cash", ordre: 1 },
      { code: "Lot 2", description: "Pneumatiques véhicules utilitaires — Pneu Cash", ordre: 2 },
      { code: "Lot 3", description: "Pneumatiques poids lourds / spécifiques — SOMAREC", ordre: 3 },
    ],
  });

  await prisma.marcheConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      reference: data.marche.reference,
      consultation: data.marche.consultation,
      maitreOuvrage: data.marche.maitre || "CACEM",
      objet: "Fourniture de pneumatiques et services associés",
      lot1Desc: "Pneumatiques véhicules légers et SUV — Pneu Cash",
      lot2Desc: "Pneumatiques véhicules utilitaires — Pneu Cash",
      lot3Desc: "Pneumatiques poids lourds / spécifiques — SOMAREC",
      documents: "2025MP061BPU_Lot_1 / LOT_2 / Lot_3_BPU.pdf",
    },
    update: {
      reference: data.marche.reference,
      consultation: data.marche.consultation,
      maitreOuvrage: data.marche.maitre || "CACEM",
    },
  });

  await prisma.centre.createMany({
    data: data.centres.map((c) => ({
      lot: c.lot,
      lotsCouvert: c.lot === "Lot 1-2" ? "Lot 1,Lot 2" : c.lot,
      nom: c.nom,
      adresse: c.adresse,
      email: c.email,
      mobile: c.mobile || null,
      fixe: c.fixe || null,
      emailCc: c.emailCc || null,
    })),
  });

  await prisma.vehicle.createMany({ data: data.vehicles });

  await prisma.tarifPneu.createMany({
    data: data.tarifsPneus.map((t) => ({
      lot: String(t.lot),
      refBpu: String(t.ref),
      dimension: String(t.dimension),
      cleRecherche: String(t.cle),
      marque: t.marque ? String(t.marque) : null,
      classification: t.classification ? String(t.classification) : null,
      prixNeufHt: t.prix_neuf_ht != null ? Number(t.prix_neuf_ht) : null,
      remisePct: t.remise_pct != null ? Number(t.remise_pct) : null,
      prixNeufRemiseHt: t.prix_neuf_remise_ht != null ? Number(t.prix_neuf_remise_ht) : null,
      prixRechapeRemiseHt: t.prix_rechape_remise_ht != null ? Number(t.prix_rechape_remise_ht) : null,
    })),
  });

  await prisma.tarifPrestation.createMany({
    data: data.tarifsPrestations.map((s) => ({
      lot: String(s.lot),
      prestation: String(s.prestation),
      prixHt: Number(s.prix_ht),
      remisePct: Number(s.remise_pct),
      prixRemiseHt: Number(s.prix_remise_ht),
    })),
  });

  console.log("Seed OK:", data.vehicles.length, "véhicules");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
