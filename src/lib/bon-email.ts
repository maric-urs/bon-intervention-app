import { prisma } from "@/lib/prisma";
import { exportBonPdf } from "@/lib/pdf-export";
import {
  formatLigneDetail,
  formatLignePrestationLabel,
  isPneuLigne,
  ligneTotalHt,
  MONTAGE_INCLUS_NOTE,
} from "@/lib/bon-lignes";

export type BonEmailLigne = {
  type?: string;
  prestation: string | null;
  emplacement: string;
  dimension: string;
  quantite: number;
  prixUnitHt: number | null;
  totalHt: number | null;
};

export type BonEmailData = {
  numeroBon: string;
  numeroEngagement: string | null;
  lot: string;
  marche: string;
  centre: { nom: string; email: string; emailCc: string | null };
  immatriculation: string;
  marque: string;
  modele: string;
  kilometrage: number | null;
  demandeur: string | null;
  totalHt: number;
  lignes: BonEmailLigne[];
};

export function buildBonEmailSubject(bon: Pick<BonEmailData, "numeroBon" | "marche" | "immatriculation">) {
  return `Bon d'intervention ${bon.numeroBon} - Marché ${bon.marche} - ${bon.immatriculation}`;
}

export function buildBonEmailBody(bon: BonEmailData) {
  let t = `Bonjour,\n\nVeuillez trouver ci-joint notre bon d'intervention (marché CACEM ${bon.marche}).\n\n`;
  t += `N° bon : ${bon.numeroBon}\n`;
  t += `N° engagement : ${bon.numeroEngagement || ""}\n`;
  t += `Lot : ${bon.lot}\n`;
  t += `Centre : ${bon.centre.nom}\n`;
  t += `Immatriculation : ${bon.immatriculation}\n`;
  t += `Véhicule : ${bon.marque} ${bon.modele}\n`;
  t += `Kilométrage : ${bon.kilometrage ?? ""}\n\n`;
  t += "PRESTATIONS :\n";
  for (const l of bon.lignes) {
    const label = formatLignePrestationLabel(l);
    const detail = formatLigneDetail(l);
    const total = ligneTotalHt(l);
    t += `- ${label}`;
    if (detail !== "—") t += ` | ${detail}`;
    t += ` | qté ${l.quantite} | ${total.toFixed(2)} EUR HT\n`;
  }
  t += `\nTOTAL HT : ${bon.totalHt.toFixed(2)} EUR\n`;
  if (bon.lignes.some(isPneuLigne)) {
    t += `\n${MONTAGE_INCLUS_NOTE}\n`;
  }
  t += "À faire figurer sur la facture : immatriculation, n° engagement, n° bon.\n\n";
  if (bon.demandeur) t += `Cordialement,\n${bon.demandeur}`;
  return t;
}

function encodeMimeHeader(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function toBase64Lines(buf: Buffer) {
  const b64 = buf.toString("base64");
  return b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
}

export function buildEml(opts: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachments: Array<{ filename: string; content: Buffer; mimeType: string }>;
}) {
  const boundary = `bon_${Date.now()}`;
  const parts: string[] = [
    "MIME-Version: 1.0",
    `To: ${opts.to}`,
  ];
  if (opts.cc) parts.push(`Cc: ${opts.cc}`);
  parts.push(`Subject: ${encodeMimeHeader(opts.subject)}`);
  parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  parts.push("");
  parts.push(`--${boundary}`);
  parts.push("Content-Type: text/plain; charset=UTF-8");
  parts.push("Content-Transfer-Encoding: 8bit");
  parts.push("");
  parts.push(opts.body.replace(/\r?\n/g, "\r\n"));
  parts.push("");

  for (const att of opts.attachments) {
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
    parts.push("Content-Transfer-Encoding: base64");
    parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    parts.push("");
    parts.push(toBase64Lines(att.content));
    parts.push("");
  }

  parts.push(`--${boundary}--`);
  parts.push("");
  return Buffer.from(parts.join("\r\n"), "utf8");
}

async function fetchBonEmailData(bonId: number): Promise<BonEmailData | null> {
  const bon = await prisma.bonIntervention.findUnique({
    where: { id: bonId },
    include: { centre: true, lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!bon) return null;
  return {
    numeroBon: bon.numeroBon,
    numeroEngagement: bon.numeroEngagement,
    lot: bon.lot,
    marche: bon.marche,
    centre: bon.centre,
    immatriculation: bon.immatriculation,
    marque: bon.marque,
    modele: bon.modele,
    kilometrage: bon.kilometrage,
    demandeur: bon.demandeur,
    totalHt: bon.totalHt,
    lignes: bon.lignes,
  };
}

export async function exportBonEml(bonId: number): Promise<{ buffer: Buffer; filename: string } | null> {
  const bon = await fetchBonEmailData(bonId);
  if (!bon) return null;

  const pdf = await exportBonPdf(bonId);
  if (!pdf) return null;

  const buffer = buildEml({
    to: bon.centre.email,
    cc: bon.centre.emailCc || "lbarru@citadelle-sa.com",
    subject: buildBonEmailSubject(bon),
    body: buildBonEmailBody(bon),
    attachments: [{ filename: pdf.filename, content: pdf.buffer, mimeType: "application/pdf" }],
  });

  return {
    buffer,
    filename: `Email-${bon.numeroBon}.eml`,
  };
}
