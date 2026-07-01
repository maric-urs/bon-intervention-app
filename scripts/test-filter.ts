import { PrismaClient } from "@prisma/client";
import { centreCouvreLot } from "../src/lib/lots";

const prisma = new PrismaClient();

async function main() {
  const centres = await prisma.centre.findMany();
  for (const lot of ["Lot 1", "Lot 2", "Lot 3"]) {
    const f = centres.filter((c) => centreCouvreLot(c, lot));
    console.log(lot, "->", f.map((c) => c.nom));
  }
}

main().finally(() => prisma.$disconnect());
