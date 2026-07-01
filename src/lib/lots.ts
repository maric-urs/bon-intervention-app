import { prisma } from "./prisma";

const DEFAULT_LOTS = [
  { code: "Lot 1", description: "Pneumatiques véhicules légers et SUV — Pneu Cash", ordre: 1 },
  { code: "Lot 2", description: "Pneumatiques véhicules utilitaires — Pneu Cash", ordre: 2 },
  { code: "Lot 3", description: "Pneumatiques poids lourds / spécifiques — SOMAREC", ordre: 3 },
];

export async function ensureLotsDefaults() {
  const count = await prisma.lot.count();
  if (count === 0) {
    await prisma.lot.createMany({ data: DEFAULT_LOTS });
  }

  const centres = await prisma.centre.findMany({
    where: { OR: [{ lotsCouvert: null }, { lotsCouvert: "" }] },
  });
  for (const c of centres) {
    let couvert = c.lot;
    if (c.lot === "Lot 1-2") couvert = "Lot 1,Lot 2";
    await prisma.centre.update({ where: { id: c.id }, data: { lotsCouvert: couvert } });
  }
}

export async function getCentres() {
  await ensureLotsDefaults();
  return prisma.centre.findMany({ orderBy: { nom: "asc" } });
}

export async function getLotsActifs() {
  await ensureLotsDefaults();
  return prisma.lot.findMany({
    where: { actif: true },
    orderBy: [{ ordre: "asc" }, { code: "asc" }],
  });
}

export async function getAllLots() {
  await ensureLotsDefaults();
  return prisma.lot.findMany({ orderBy: [{ ordre: "asc" }, { code: "asc" }] });
}

export function centreCouvreLot(
  centre: { lot: string; lotsCouvert?: string | null },
  lotCode: string
): boolean {
  if (centre.lotsCouvert) {
    return centre.lotsCouvert
      .split(",")
      .map((s) => s.trim())
      .includes(lotCode);
  }
  if (lotCode === "Lot 1" || lotCode === "Lot 2") {
    return centre.lot === "Lot 1-2" || centre.lot === lotCode;
  }
  if (lotCode === "Lot 3") return centre.lot === "Lot 3";
  return centre.lot.includes(lotCode) || lotCode.includes(centre.lot);
}
