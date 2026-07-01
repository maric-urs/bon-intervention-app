import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const centres = await prisma.centre.findMany({ orderBy: { nom: "asc" } });
  console.log(JSON.stringify(centres.map((c) => ({ id: c.id, nom: c.nom, lot: c.lot, lotsCouvert: c.lotsCouvert })), null, 2));
}

main().finally(() => prisma.$disconnect());
