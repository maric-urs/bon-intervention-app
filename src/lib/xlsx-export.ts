import ExcelJS from "exceljs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { STATUT_LABELS, type Statut } from "@/lib/utils";

const TEMPLATE_PATH = path.join(process.cwd(), "assets", "bon-intervention-cacem.xlsx");
const SHEETS_INUTILES = ["SAISIE", "OUTLOOK_MACRO"];

const bonInclude = {
  centre: true,
  lignes: { orderBy: { ordre: "asc" as const } },
} as const;

type BonExport = Awaited<ReturnType<typeof fetchBons>>[number];

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F4E79" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCCCCCC" } },
  left: { style: "thin", color: { argb: "FFCCCCCC" } },
  bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
  right: { style: "thin", color: { argb: "FFCCCCCC" } },
};

async function fetchBons() {
  return prisma.bonIntervention.findMany({
    include: bonInclude,
    orderBy: { createdAt: "desc" },
  });
}

async function fetchBon(id: number) {
  return prisma.bonIntervention.findUnique({
    where: { id },
    include: bonInclude,
  });
}

async function loadTemplate(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);
  return wb;
}

function removeSheets(wb: ExcelJS.Workbook, names: string[]) {
  for (const name of names) {
    const ws = wb.getWorksheet(name);
    if (ws) wb.removeWorksheet(ws.id);
  }
}

function styleHeaderRow(ws: ExcelJS.Worksheet, row: number, cols: number) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  }
}

function setLabelValue(ws: ExcelJS.Worksheet, row: number, labelCol: number, valueCol: number, label: string, value: ExcelJS.CellValue) {
  const labelCell = ws.getCell(row, labelCol);
  labelCell.value = label;
  labelCell.font = { bold: true, size: 10 };
  const valueCell = ws.getCell(row, valueCol);
  valueCell.value = value;
  valueCell.border = THIN_BORDER;
}

function createBonSheet(wb: ExcelJS.Workbook, bon: BonExport) {
  const existing = wb.getWorksheet("BON");
  if (existing) wb.removeWorksheet(existing.id);

  const ws = wb.addWorksheet("BON");
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 8;
  ws.getColumn(8).width = 14;
  ws.getColumn(9).width = 12;

  ws.mergeCells("A1:I1");
  const title = ws.getCell("A1");
  title.value = `BON D'INTERVENTION — Marché ${bon.marche} (CACEM)`;
  title.font = { bold: true, size: 14, color: { argb: "FF1F4E79" } };

  setLabelValue(ws, 3, 1, 2, "N° bon", bon.numeroBon);
  setLabelValue(ws, 3, 4, 5, "Date", new Date(bon.dateBon));
  ws.getCell(3, 5).numFmt = "dd/mm/yyyy";
  setLabelValue(ws, 3, 7, 8, "Marché", bon.marche);

  setLabelValue(ws, 4, 1, 2, "N° engagement", bon.numeroEngagement ?? "");
  setLabelValue(ws, 4, 4, 5, "Lot", bon.lot);
  setLabelValue(ws, 4, 7, 8, "Centre", bon.centre.nom);

  setLabelValue(ws, 5, 1, 2, "Demandeur", bon.demandeur ?? "");
  setLabelValue(ws, 5, 4, 5, "Kilométrage", bon.kilometrage ?? "");
  setLabelValue(ws, 5, 7, 8, "Statut", STATUT_LABELS[bon.statut as Statut] || bon.statut);

  setLabelValue(ws, 6, 1, 2, "Immatriculation", bon.immatriculation);
  setLabelValue(ws, 6, 4, 5, "Marque", bon.marque);
  setLabelValue(ws, 6, 7, 8, "Modèle", bon.modele);

  ws.getCell("A8").value = "LIGNES DE PRESTATION";
  ws.getCell("A8").font = { bold: true, size: 11, color: { argb: "FF1F4E79" } };

  const headers = ["Ligne", "Type", "Prestation", "Emp.", "Dimension", "Qté", "Prix unit. HT", "Total HT", "Réf BPU"];
  headers.forEach((h, i) => {
    ws.getCell(9, i + 1).value = h;
  });
  styleHeaderRow(ws, 9, headers.length);

  bon.lignes.forEach((ligne, i) => {
    const r = 10 + i;
    const values: ExcelJS.CellValue[] = [
      i + 1,
      ligne.type,
      ligne.prestation ?? "",
      ligne.emplacement,
      ligne.dimension,
      ligne.quantite,
      ligne.prixUnitHt ?? "",
      ligne.totalHt ?? (ligne.prixUnitHt ?? 0) * ligne.quantite,
      ligne.refBpu ?? "",
    ];
    values.forEach((v, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = v;
      cell.border = THIN_BORDER;
      if (c >= 5) cell.alignment = { horizontal: "right" };
    });
  });

  const totalRow = 10 + bon.lignes.length + 1;
  ws.getCell(totalRow, 7).value = "TOTAL HT";
  ws.getCell(totalRow, 7).font = { bold: true };
  ws.getCell(totalRow, 7).alignment = { horizontal: "right" };
  const totalCell = ws.getCell(totalRow, 8);
  totalCell.value = bon.totalHt;
  totalCell.numFmt = '#,##0.00 "€"';
  totalCell.font = { bold: true };
  totalCell.border = THIN_BORDER;

  const noteRow = totalRow + 2;
  ws.mergeCells(noteRow, 1, noteRow, 9);
  const note = ws.getCell(noteRow, 1);
  note.value =
    `À faire figurer sur la facture : immatriculation ${bon.immatriculation} | ` +
    `N° engagement ${bon.numeroEngagement || "—"} | N° bon ${bon.numeroBon}`;
  note.font = { bold: true, size: 10, color: { argb: "FFC00000" } };
  note.alignment = { wrapText: true };

  const contactRow = noteRow + 1;
  setLabelValue(ws, contactRow, 1, 2, "Email centre", bon.centre.email);
  setLabelValue(ws, contactRow, 4, 5, "Copie coordination", bon.centre.emailCc || "lbarru@citadelle-sa.com");
}

function fillHistorique(ws: ExcelJS.Worksheet, bons: BonExport[]) {
  const maxClear = Math.max(ws.rowCount, bons.length + 10, 50);
  for (let row = 2; row <= maxClear; row++) {
    for (let col = 1; col <= 8; col++) ws.getCell(row, col).value = null;
  }

  bons.forEach((bon, idx) => {
    const row = idx + 2;
    const horodatage = bon.envoyeAt ?? bon.updatedAt ?? bon.createdAt;
    const dateCell = ws.getCell(row, 1);
    dateCell.value = new Date(horodatage);
    dateCell.numFmt = "dd/mm/yyyy hh:mm";
    ws.getCell(row, 2).value = bon.numeroBon;
    ws.getCell(row, 3).value = bon.numeroEngagement ?? "";
    ws.getCell(row, 4).value = bon.lot;
    ws.getCell(row, 5).value = bon.centre.nom;
    ws.getCell(row, 6).value = bon.immatriculation;
    ws.getCell(row, 7).value = bon.totalHt;
    ws.getCell(row, 8).value = STATUT_LABELS[bon.statut as Statut] || bon.statut;
  });
}

async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function exportBonXlsx(bonId: number): Promise<{ buffer: Buffer; filename: string } | null> {
  const bon = await fetchBon(bonId);
  if (!bon) return null;

  const wb = new ExcelJS.Workbook();
  createBonSheet(wb, bon);

  return {
    buffer: await workbookToBuffer(wb),
    filename: `Bon-intervention-${bon.numeroBon}.xlsx`,
  };
}

export async function exportSuiviXlsx(): Promise<{ buffer: Buffer; filename: string }> {
  const allBons = await fetchBons();
  const wb = await loadTemplate();
  removeSheets(wb, SHEETS_INUTILES);

  const historique = wb.getWorksheet("HISTORIQUE");
  if (!historique) throw new Error("Modèle Excel invalide");

  fillHistorique(historique, allBons);

  const date = new Date().toISOString().slice(0, 10);
  return {
    buffer: await workbookToBuffer(wb),
    filename: `Suivi-bons-intervention-CACEM-${date}.xlsx`,
  };
}
