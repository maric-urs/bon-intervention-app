import { prisma } from "./prisma";
import { normCleTarif } from "./tarif-utils";

export async function lookupPrixPneu(lot: string, cleTarif: string, dimension: string) {
  const cle = cleTarif || normCleTarif(dimension);
  if (!cle) return null;

  let tarif = await prisma.tarifPneu.findFirst({
    where: { lot, cleRecherche: cle },
  });
  if (!tarif && dimension) {
    tarif = await prisma.tarifPneu.findFirst({
      where: { lot, cleRecherche: dimension },
    });
  }
  return tarif;
}

export async function getVehicleLines(immatriculation: string) {
  return prisma.vehicle.findMany({
    where: { immatriculation },
    orderBy: { emplacement: "asc" },
  });
}

export async function getUniqueImmatriculations() {
  const rows = await prisma.vehicle.findMany({
    select: { immatriculation: true, marque: true, modele: true, lotSuggere: true },
    distinct: ["immatriculation"],
    orderBy: { immatriculation: "asc" },
  });
  return rows;
}
