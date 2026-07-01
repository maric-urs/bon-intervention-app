import { prisma } from "./prisma";

export async function getMarcheConfig() {
  let config = await prisma.marcheConfig.findUnique({ where: { id: 1 } });
  if (!config) {
    config = await prisma.marcheConfig.create({
      data: {
        id: 1,
        reference: "25.061",
        consultation: "202507011207",
        maitreOuvrage: "CACEM",
        objet: "Fourniture de pneumatiques et services associés",
        lot1Desc: "Pneumatiques véhicules légers et SUV — Pneu Cash",
        lot2Desc: "Pneumatiques véhicules utilitaires — Pneu Cash",
        lot3Desc: "Pneumatiques poids lourds / spécifiques — SOMAREC",
        documents: "2025MP061BPU_Lot_1 / LOT_2 / Lot_3_BPU.pdf",
      },
    });
  }
  return config;
}
