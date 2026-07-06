import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuro(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(d));
}

/** Nombre de pneus remplacés par essieu (AVANT ou ARRIÈRE). */
export const QUANTITE_PNEUS_PAR_EMPACEMENT = 2;

export function generateNumeroBon(seq: number) {
  const d = new Date();
  const ymd =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  return `${ymd}-BI-${String(seq).padStart(3, "0")}`;
}

export const STATUTS = [
  "BROUILLON",
  "ENVOYE",
  "EN_COURS",
  "FACTURE",
  "CLOTURE",
  "ANNULE",
] as const;

export type Statut = (typeof STATUTS)[number];

export const STATUT_LABELS: Record<Statut, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  EN_COURS: "En cours",
  FACTURE: "Facturé",
  CLOTURE: "Clôturé",
  ANNULE: "Annulé",
};

export const STATUT_COLORS: Record<Statut, string> = {
  BROUILLON: "bg-slate-100 text-slate-700",
  ENVOYE: "bg-blue-100 text-blue-800",
  EN_COURS: "bg-amber-100 text-amber-800",
  FACTURE: "bg-emerald-100 text-emerald-800",
  CLOTURE: "bg-gray-200 text-gray-800",
  ANNULE: "bg-red-100 text-red-800",
};

export function buildMailtoUrl(opts: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}) {
  const parts: string[] = [];
  if (opts.cc) parts.push(`cc=${encodeURIComponent(opts.cc)}`);
  parts.push(`subject=${encodeURIComponent(opts.subject)}`);
  parts.push(`body=${encodeURIComponent(opts.body)}`);
  return `mailto:${opts.to}?${parts.join("&")}`;
}
