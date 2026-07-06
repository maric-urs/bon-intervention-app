import PDFDocument from "pdfkit";
import path from "path";
import { prisma } from "@/lib/prisma";

const LOGO_PATH = path.join(process.cwd(), "assets", "cacem-logo.png");
const YELLOW = "#FFFF00";
const GRAY = "#D9D9D9";
const RED = "#C00000";
const BORDER = "#000000";

type BonPdf = NonNullable<Awaited<ReturnType<typeof fetchBon>>>;

async function fetchBon(id: number) {
  return prisma.bonIntervention.findUnique({
    where: { id },
    include: {
      centre: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });
}

function formatDateFr(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatMarche(ref: string) {
  return ref.replace(".", ",");
}

function formatPrix(n: number | null | undefined) {
  if (n == null) return "";
  return `${n.toFixed(2).replace(".", ",")} €`;
}

function ligneLabel(l: BonPdf["lignes"][number]) {
  if (l.prestation) return l.prestation;
  return `${l.emplacement} — ${l.dimension}`;
}

function drawBonPdf(doc: PDFKit.PDFDocument, bon: BonPdf) {
  const pageW = doc.page.width;
  const margin = 40;
  const contentW = pageW - margin * 2;

  // —— En-tête ——
  try {
    doc.image(LOGO_PATH, margin, 36, { width: 155 });
  } catch {
    doc.font("Helvetica-Bold").fontSize(14).text("CACEM", margin, 45);
  }

  const centreTel = bon.centre.fixe || bon.centre.mobile || "0596 57 25 25";
  doc.font("Helvetica").fontSize(10).fillColor("#000000");
  doc.text(bon.centre.nom.toUpperCase(), margin, 40, { width: contentW, align: "right" });
  doc.text(bon.centre.email, margin, 54, { width: contentW, align: "right" });
  doc.text(bon.centre.emailCc || "lbarru@citadelle-sa.com", margin, 68, { width: contentW, align: "right" });
  doc.text(centreTel, margin, 82, { width: contentW, align: "right" });

  // —— Titre ——
  let y = 118;
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#000000");
  doc.text("BON D'INTERVENTION N°", margin, y, { continued: false });

  const numBoxX = margin + 210;
  doc.rect(numBoxX, y - 2, 90, 22).fillAndStroke(YELLOW, BORDER);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#000000");
  doc.text(bon.numeroBon, numBoxX + 4, y + 2, { width: 82, align: "center" });

  doc.font("Helvetica").fontSize(11);
  doc.text(`Date : ${formatDateFr(bon.dateBon)}`, margin, y + 32, { width: contentW, align: "right" });
  doc.text(`Marché : ${formatMarche(bon.marche)}`, margin, y + 48, { width: contentW, align: "right" });

  const lotLabelW = doc.widthOfString("Lot : ");
  const lotBoxW = 70;
  const lotBoxX = pageW - margin - lotBoxW;
  const lotTextX = lotBoxX - lotLabelW - 4;
  doc.text("Lot :", lotTextX, y + 64);
  doc.rect(lotBoxX, y + 60, lotBoxW, 20).fillAndStroke(YELLOW, BORDER);
  doc.text(bon.lot.replace("Lot ", ""), lotBoxX + 2, y + 64, { width: lotBoxW - 4, align: "center" });

  // —— Tableau VEHICULE ——
  y = 210;
  y = drawLabelTable(doc, margin, y, contentW, "VEHICULE", [
    { label: "IMMATRICULATION", value: bon.immatriculation },
    { label: "MARQUE", value: bon.marque },
    { label: "MODELE", value: bon.modele },
    { label: "KILOMETRAGE", value: bon.kilometrage != null ? String(bon.kilometrage) : "" },
  ]);

  // —— Pneus + autres prestations ——
  const pneuLignes = bon.lignes.filter((l) => l.type === "Pneumatique neuf" || (!l.prestation && l.emplacement !== "—"));
  const autreLignes = bon.lignes.filter((l) => l.prestation || (l.type !== "Pneumatique neuf" && l.emplacement === "—"));
  const firstPneu = pneuLignes[0];
  const suiteLignes = [...pneuLignes.slice(1), ...autreLignes];

  y += 14;
  const halfW = (contentW - 12) / 2;
  const prestaX = margin;
  const interX = margin + halfW + 12;

  const prestaEnd = drawLabelTable(doc, prestaX, y, halfW, "PRESTATION", [
    { label: "DIMENSION", value: firstPneu?.dimension ?? "" },
    { label: "QUANTITE", value: firstPneu ? String(firstPneu.quantite) : "" },
    { label: "EMPLACEMENT", value: firstPneu?.emplacement ?? "" },
    { label: "PRIX", value: formatPrix(firstPneu?.prixUnitHt) },
  ]);

  drawInterventionTable(doc, interX, y, halfW, suiteLignes, bon.totalHt);

  // —— Pied de page ——
  const footerY = Math.max(prestaEnd, y + 130) + 28;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(RED);
  doc.text("VEUILLEZ FAIRE APPARAITRE SUR VOTRE FACTURE :", margin, footerY);
  doc.font("Helvetica").fontSize(10);
  doc.text("le n° d'immatriculation", margin, footerY + 16);
  doc.text("le n° Engagement", margin, footerY + 30);
  doc.text("le n° du bon d'intervention", margin, footerY + 44);

  if (bon.numeroEngagement) {
    doc.font("Helvetica").fontSize(9).fillColor("#333333");
    doc.text(`N° engagement : ${bon.numeroEngagement}`, margin, footerY + 62);
  }
}

function drawLabelTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  title: string,
  rows: { label: string; value: string }[]
) {
  const headerH = 22;
  const rowH = 26;
  const labelW = w * 0.42;
  const valueW = w - labelW;

  doc.rect(x, y, w, headerH).fillAndStroke(GRAY, BORDER);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text(title, x, y + 6, { width: w, align: "center" });

  let cy = y + headerH;
  for (const row of rows) {
    doc.rect(x, cy, labelW, rowH).stroke(BORDER);
    doc.rect(x + labelW, cy, valueW, rowH).fillAndStroke(YELLOW, BORDER);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
    doc.text(row.label, x + 5, cy + 8, { width: labelW - 10 });
    doc.font("Helvetica").fontSize(10);
    doc.text(row.value, x + labelW + 5, cy + 8, { width: valueW - 10 });
    cy += rowH;
  }
  return cy;
}

function drawInterventionTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  lignes: BonPdf["lignes"],
  totalHt: number
) {
  const headerH = 22;
  const rowH = 26;
  const labelW = w * 0.35;
  const valueW = w - labelW;

  doc.rect(x, y, w, headerH).fillAndStroke(GRAY, BORDER);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
  doc.text("INTERVENTION", x, y + 6, { width: w, align: "center" });

  let cy = y + headerH;
  const maxRows = 3;
  for (let i = 0; i < maxRows; i++) {
    const ligne = lignes[i];
    doc.rect(x, cy, labelW, rowH).stroke(BORDER);
    if (ligne) {
      doc.rect(x + labelW, cy, valueW, rowH).fillAndStroke(YELLOW, BORDER);
      doc.font("Helvetica").fontSize(9).fillColor("#000000");
      const txt = `${ligneLabel(ligne)} — ${formatPrix(ligne.prixUnitHt)}`;
      doc.text(txt, x + labelW + 4, cy + 8, { width: valueW - 8 });
    } else {
      doc.rect(x + labelW, cy, valueW, rowH).stroke(BORDER);
    }
    cy += rowH;
  }

  doc.rect(x, cy, labelW, rowH).stroke(BORDER);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
  doc.text("PRIX", x + 5, cy + 8, { width: labelW - 10 });
  doc.rect(x + labelW, cy, valueW, rowH).fillAndStroke(YELLOW, BORDER);
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(formatPrix(totalHt), x + labelW + 4, cy + 8, { width: valueW - 8, align: "right" });
}

export async function exportBonPdf(bonId: number): Promise<{ buffer: Buffer; filename: string } | null> {
  const bon = await fetchBon(bonId);
  if (!bon) return null;

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    drawBonPdf(doc, bon);
    doc.end();
  });

  return {
    buffer,
    filename: `Bon-intervention-${bon.numeroBon}.pdf`,
  };
}
