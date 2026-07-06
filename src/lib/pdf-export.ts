import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const YELLOW = "#FFFF00";
const GRAY = "#D9D9D9";
const RED = "#C00000";
const BORDER = "#000000";
const FONT = "Times-Roman";
const FONT_BOLD = "Times-Bold";

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "assets", "cacem-logo.png"),
    path.join(process.cwd(), "..", "assets", "cacem-logo.png"),
    path.join(__dirname, "..", "..", "assets", "cacem-logo.png"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

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

function formatLot(lot: string) {
  return lot.replace(/^Lot\s*/i, "");
}

function formatPrix(n: number | null | undefined) {
  if (n == null) return "";
  return `${n.toFixed(2).replace(".", ",")}`;
}

function ligneIntervention(l: BonPdf["lignes"][number]) {
  if (l.prestation) return l.prestation;
  return `${l.emplacement} — ${l.dimension}`;
}

function splitLignes(bon: BonPdf) {
  const pneuLignes = bon.lignes.filter(
    (l) => l.type === "Pneumatique neuf" || (!l.prestation && l.emplacement !== "—")
  );
  const autreLignes = bon.lignes.filter(
    (l) => l.prestation || (l.type !== "Pneumatique neuf" && l.emplacement === "—")
  );
  return { pneuLignes, autreLignes };
}

function drawBonPdf(doc: PDFKit.PDFDocument, bon: BonPdf) {
  doc.strokeColor(BORDER).lineWidth(0.8).fillColor("#000000");

  const pageW = doc.page.width;
  const margin = 48;
  const contentW = pageW - margin * 2;
  const rightColX = margin + contentW * 0.52;

  // —— En-tête ——
  const headerTop = 42;
  const logoPath = resolveLogoPath();
  if (logoPath) {
    doc.image(logoPath, margin, headerTop, { width: 168 });
  }

  const centreTel = bon.centre.fixe || bon.centre.mobile || "0596 57 25 25";
  const contactX = rightColX;
  const contactW = pageW - margin - contactX;
  doc.font(FONT).fontSize(11);
  doc.text(bon.centre.nom.toUpperCase(), contactX, headerTop, { width: contactW, align: "right" });
  doc.fontSize(10);
  doc.text("adresses email centres et barru", contactX, headerTop + 14, { width: contactW, align: "right" });
  doc.text(bon.centre.email, contactX, headerTop + 28, { width: contactW, align: "right" });
  doc.text(bon.centre.emailCc || "lbarru@citadelle-sa.com", contactX, headerTop + 42, { width: contactW, align: "right" });
  doc.text(centreTel, contactX, headerTop + 56, { width: contactW, align: "right" });

  // —— Titre + métadonnées ——
  const titleY = 118;
  doc.font(FONT_BOLD).fontSize(18);
  const titleText = "BON D'INTERVENTION N°";
  doc.text(titleText, margin, titleY);

  const numBoxX = margin + doc.widthOfString(titleText) + 10;
  const numBoxW = Math.min(130, rightColX - numBoxX - 8);
  drawYellowCell(doc, numBoxX, titleY - 3, numBoxW, 24);
  doc.font(FONT_BOLD).fontSize(13);
  doc.text(bon.numeroBon, numBoxX + 4, titleY + 2, { width: numBoxW - 8, align: "center" });

  doc.font(FONT).fontSize(11);
  doc.text(`Date : ${formatDateFr(bon.dateBon)}`, contactX, titleY, { width: contactW, align: "right" });
  doc.text(`Marché : ${formatMarche(bon.marche)}`, contactX, titleY + 16, { width: contactW, align: "right" });

  const lotLabel = "Lot :";
  const lotBoxW = 58;
  const lotBoxX = pageW - margin - lotBoxW;
  const lotLabelX = lotBoxX - doc.widthOfString(lotLabel) - 6;
  doc.text(lotLabel, lotLabelX, titleY + 32);
  drawYellowCell(doc, lotBoxX, titleY + 28, lotBoxW, 20);
  doc.text(formatLot(bon.lot), lotBoxX + 2, titleY + 32, { width: lotBoxW - 4, align: "center" });

  if (bon.numeroEngagement) {
    doc.font(FONT).fontSize(10);
    doc.text(`N° engagement : ${bon.numeroEngagement}`, margin, titleY + 34);
  }

  // —— VEHICULE ——
  let y = 178;
  y = drawLabelTable(doc, margin, y, contentW, "VEHICULE", [
    { label: "IMMATRICULATION", value: bon.immatriculation },
    { label: "MARQUE", value: bon.marque },
    { label: "MODELE", value: bon.modele },
    { label: "KILLOMETRAGE", value: bon.kilometrage != null ? String(bon.kilometrage) : "" },
  ]);

  // —— PRESTATION (pneus) + INTERVENTION ——
  const { pneuLignes, autreLignes } = splitLignes(bon);
  const colGap = 14;
  const leftW = contentW * 0.48;
  const rightW = contentW - leftW - colGap;
  const blockTop = y + 16;

  let leftBottom = blockTop;
  if (pneuLignes.length === 0) {
    leftBottom = drawLabelTable(doc, margin, blockTop, leftW, "PRESTATION", [
      { label: "DIMENSION", value: "" },
      { label: "QUANTITE", value: "" },
      { label: "EMPLACEMENT", value: "" },
      { label: "PRIX", value: "" },
    ]);
  } else {
    for (let i = 0; i < pneuLignes.length; i++) {
      const pneu = pneuLignes[i];
      const title = pneuLignes.length > 1 ? `PRESTATION — ${pneu.emplacement}` : "PRESTATION";
      leftBottom = drawLabelTable(doc, margin, leftBottom, leftW, title, [
        { label: "DIMENSION", value: pneu.dimension },
        { label: "QUANTITE", value: String(pneu.quantite) },
        { label: "EMPLACEMENT", value: pneu.emplacement },
        { label: "PRIX", value: formatPrix(pneu.prixUnitHt) },
      ]);
      if (i < pneuLignes.length - 1) leftBottom += 10;
    }
  }

  const interBottom = drawInterventionTable(
    doc,
    margin + leftW + colGap,
    blockTop,
    rightW,
    autreLignes,
    bon.totalHt,
    leftBottom - blockTop
  );

  const footerY = Math.max(leftBottom, interBottom) + 36;

  // —— Pied de page ——
  doc.font(FONT_BOLD).fontSize(11).fillColor(RED);
  doc.text("VEUILLEZ FAIRE APPARAITRE SUR VOTRE FACTURE :", margin, footerY);
  doc.font(FONT).fontSize(11);
  doc.text("le n° d'immatriculation", margin, footerY + 18);
  doc.text("le n° Engagement", margin, footerY + 34);
  doc.text("le n° du bon d'intervention", margin, footerY + 50);

  doc.font(FONT).fontSize(9).fillColor("#444444");
  doc.text(
    `Réf. bon : ${bon.numeroBon}  |  Immat. : ${bon.immatriculation}  |  Engagement : ${bon.numeroEngagement || "—"}`,
    margin,
    footerY + 72,
    { width: contentW }
  );
}

function drawYellowCell(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).fillAndStroke(YELLOW, BORDER);
  doc.fillColor("#000000");
}

function drawLabelTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  title: string,
  rows: { label: string; value: string }[]
) {
  const headerH = 24;
  const rowH = 28;
  const labelW = Math.round(w * 0.44);
  const valueW = w - labelW;

  doc.rect(x, y, w, headerH).fillAndStroke(GRAY, BORDER);
  doc.font(FONT_BOLD).fontSize(12).fillColor("#000000");
  doc.text(title, x, y + 7, { width: w, align: "center" });

  let cy = y + headerH;
  for (const row of rows) {
    doc.rect(x, cy, labelW, rowH).stroke();
    drawYellowCell(doc, x + labelW, cy, valueW, rowH);
    doc.font(FONT_BOLD).fontSize(10).fillColor("#000000");
    doc.text(row.label, x + 6, cy + 9, { width: labelW - 12 });
    doc.font(FONT).fontSize(11);
    doc.text(row.value, x + labelW + 6, cy + 9, { width: valueW - 12 });
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
  totalHt: number,
  minHeight: number
) {
  const headerH = 24;
  const labelW = Math.round(w * 0.28);
  const valueW = w - labelW;
  const minBody = minHeight - headerH;
  const rowCount = Math.max(3, lignes.length);
  const rowH = Math.max(28, Math.floor(minBody / (rowCount + 1)));

  doc.rect(x, y, w, headerH).fillAndStroke(GRAY, BORDER);
  doc.font(FONT_BOLD).fontSize(12).fillColor("#000000");
  doc.text("INTERVENTION", x, y + 7, { width: w, align: "center" });

  let cy = y + headerH;
  for (let i = 0; i < rowCount; i++) {
    const ligne = lignes[i];
    doc.rect(x, cy, labelW, rowH).stroke();
    if (ligne) {
      drawYellowCell(doc, x + labelW, cy, valueW, rowH);
      doc.font(FONT).fontSize(9).fillColor("#000000");
      const txt = `${ligneIntervention(ligne)}${ligne.prixUnitHt != null ? ` — ${formatPrix(ligne.prixUnitHt)} €` : ""}`;
      doc.text(txt, x + labelW + 5, cy + 9, { width: valueW - 10, lineGap: 1 });
    } else {
      doc.rect(x + labelW, cy, valueW, rowH).stroke();
    }
    cy += rowH;
  }

  doc.rect(x, cy, labelW, rowH).stroke();
  doc.font(FONT_BOLD).fontSize(10).fillColor("#000000");
  doc.text("PRIX", x + 6, cy + 10, { width: labelW - 12 });
  drawYellowCell(doc, x + labelW, cy, valueW, rowH);
  doc.font(FONT_BOLD).fontSize(12);
  doc.text(`${formatPrix(totalHt)} €`, x + labelW + 6, cy + 9, { width: valueW - 12, align: "right" });

  return cy + rowH;
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
