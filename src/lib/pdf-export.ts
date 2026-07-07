import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  formatLigneDetail,
  formatLignePrestationLabel,
  isPneuLigne,
  ligneTotalHt,
  MONTAGE_INCLUS_NOTE,
} from "@/lib/bon-lignes";

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
  const titleText = "BON D'INTERVENTION N°";
  const headerBottom = drawNumeroBonHeader(doc, bon.numeroBon, margin, titleY, titleText, rightColX - 12);

  doc.font(FONT).fontSize(11);
  doc.text(`Date : ${formatDateFr(bon.dateBon)}`, contactX, titleY, { width: contactW, align: "right" });
  doc.text(`Marché : ${formatMarche(bon.marche)}`, contactX, titleY + 16, { width: contactW, align: "right" });

  const lotLabel = "Lot :";
  const lotBoxW = 58;
  const lotBoxX = pageW - margin - lotBoxW;
  const lotLabelX = lotBoxX - doc.widthOfString(lotLabel) - 6;
  const lotY = titleY + 32;
  doc.text(lotLabel, lotLabelX, lotY);
  drawValueCell(doc, lotBoxX, lotY - 4, lotBoxW, 20);
  doc.text(formatLot(bon.lot), lotBoxX + 2, lotY, { width: lotBoxW - 4, align: "center", lineBreak: false });

  let metaBottom = titleY + 52;
  if (bon.numeroEngagement) {
    doc.font(FONT).fontSize(10);
    doc.text(`N° engagement : ${bon.numeroEngagement}`, margin, titleY + 52, {
      width: rightColX - margin - 8,
      lineBreak: false,
    });
    metaBottom = titleY + 66;
  }

  // —— VEHICULE ——
  let y = Math.max(headerBottom, metaBottom) + 14;
  y = drawLabelTable(doc, margin, y, contentW, "VEHICULE", [
    { label: "IMMATRICULATION", value: bon.immatriculation },
    { label: "MARQUE", value: bon.marque },
    { label: "MODELE", value: bon.modele },
    { label: "KILLOMETRAGE", value: bon.kilometrage != null ? String(bon.kilometrage) : "" },
  ]);

  // —— PRESTATIONS ——
  const blockTop = y + 16;
  const hasPneus = bon.lignes.some(isPneuLigne);
  const prestBottom = drawPrestationsTable(doc, margin, blockTop, contentW, bon.lignes);
  let noteY = prestBottom + 8;
  if (hasPneus) {
    doc.font(FONT).fontSize(9).fillColor("#444444");
    doc.text(MONTAGE_INCLUS_NOTE, margin, noteY, { width: contentW });
    noteY += 16;
  }

  const totalY = drawMontantTotal(doc, margin, noteY + 10, contentW, bon.totalHt);
  const footerY = totalY + 24;

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

/** Titre + case du n° de bon, sans retour à la ligne parasite. */
function drawNumeroBonHeader(
  doc: PDFKit.PDFDocument,
  numero: string,
  margin: number,
  titleY: number,
  titleText: string,
  maxRight: number
): number {
  const boxH = 24;
  const hPad = 12;

  doc.font(FONT_BOLD).fontSize(18);
  doc.text(titleText, margin, titleY);
  const titleEndX = margin + doc.widthOfString(titleText);
  const inlineMaxW = maxRight - titleEndX - 10;

  let fontSize = 13;
  doc.font(FONT_BOLD);
  while (fontSize >= 8) {
    doc.fontSize(fontSize);
    const textW = doc.widthOfString(numero);
    const boxW = textW + hPad;
    if (boxW <= inlineMaxW) {
      const numBoxX = titleEndX + 10;
      drawValueCell(doc, numBoxX, titleY - 3, boxW, boxH);
      doc.text(numero, numBoxX + hPad / 2, titleY + 2, {
        width: boxW - hPad,
        align: "center",
        lineBreak: false,
      });
      return titleY + boxH;
    }
    fontSize -= 0.5;
  }

  // Numéro trop long pour la ligne du titre : case dédiée en dessous
  const stackY = titleY + 26;
  doc.font(FONT_BOLD).fontSize(12);
  const boxW = Math.min(doc.widthOfString(numero) + hPad, maxRight - margin);
  drawValueCell(doc, margin, stackY, boxW, boxH);
  doc.text(numero, margin + hPad / 2, stackY + 5, {
    width: boxW - hPad,
    align: "left",
    lineBreak: false,
  });
  return stackY + boxH;
}

function drawValueCell(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).stroke();
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
    drawValueCell(doc, x + labelW, cy, valueW, rowH);
    doc.font(FONT_BOLD).fontSize(10).fillColor("#000000");
    doc.text(row.label, x + 6, cy + 9, { width: labelW - 12 });
    doc.font(FONT).fontSize(11);
    doc.text(row.value, x + labelW + 6, cy + 9, { width: valueW - 12 });
    cy += rowH;
  }
  return cy;
}

function drawPrestationsTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  lignes: BonPdf["lignes"]
) {
  const headerH = 24;
  const subHeaderH = 22;
  const rowH = 28;
  const rowCount = Math.max(1, lignes.length);

  const colPrestation = Math.round(w * 0.34);
  const colDetail = Math.round(w * 0.26);
  const colQte = Math.round(w * 0.08);
  const colUnit = Math.round(w * 0.16);
  const colTotal = w - colPrestation - colDetail - colQte - colUnit;

  const cols = [
    { w: colPrestation, label: "PRESTATION", align: "left" as const },
    { w: colDetail, label: "DÉTAIL", align: "left" as const },
    { w: colQte, label: "QTÉ", align: "center" as const },
    { w: colUnit, label: "PRIX UNIT. HT", align: "right" as const },
    { w: colTotal, label: "MONTANT HT", align: "right" as const },
  ];

  doc.rect(x, y, w, headerH).fillAndStroke(GRAY, BORDER);
  doc.font(FONT_BOLD).fontSize(12).fillColor("#000000");
  doc.text("PRESTATIONS", x, y + 7, { width: w, align: "center" });

  let cy = y + headerH;
  let cx = x;
  for (const col of cols) {
    doc.rect(cx, cy, col.w, subHeaderH).stroke();
    doc.font(FONT_BOLD).fontSize(8).fillColor("#000000");
    doc.text(col.label, cx + 4, cy + 7, { width: col.w - 8, align: col.align });
    cx += col.w;
  }
  cy += subHeaderH;

  const dataRows =
    lignes.length > 0
      ? lignes
      : [
          {
            type: "",
            prestation: null,
            emplacement: "",
            dimension: "",
            quantite: 0,
            prixUnitHt: null,
            totalHt: null,
          } as BonPdf["lignes"][number],
        ];

  for (let i = 0; i < rowCount; i++) {
    const ligne = dataRows[i];
    const values = ligne
      ? [
          formatLignePrestationLabel(ligne),
          formatLigneDetail(ligne),
          ligne.quantite ? String(ligne.quantite) : "",
          formatPrix(ligne.prixUnitHt),
          formatPrix(ligneTotalHt(ligne)),
        ]
      : ["", "", "", "", ""];

    cx = x;
    for (let c = 0; c < cols.length; c++) {
      drawValueCell(doc, cx, cy, cols[c].w, rowH);
      doc.font(FONT).fontSize(c === 0 ? 9 : 10).fillColor("#000000");
      doc.text(values[c], cx + 4, cy + 9, {
        width: cols[c].w - 8,
        align: cols[c].align,
        lineGap: 0,
      });
      cx += cols[c].w;
    }
    cy += rowH;
  }

  return cy;
}

function drawMontantTotal(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  totalHt: number
) {
  const h = 34;
  const labelW = Math.round(w * 0.72);
  const valueW = w - labelW;

  doc.rect(x, y, labelW, h).fillAndStroke(GRAY, BORDER);
  drawValueCell(doc, x + labelW, y, valueW, h);
  doc.font(FONT_BOLD).fontSize(12).fillColor("#000000");
  doc.text("MONTANT TOTAL HT", x + 8, y + 11, { width: labelW - 16, align: "right" });
  doc.fontSize(14);
  doc.text(`${formatPrix(totalHt)} €`, x + labelW + 8, y + 10, {
    width: valueW - 16,
    align: "right",
  });

  return y + h;
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
