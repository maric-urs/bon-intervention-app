/** Clé de recherche tarif BPU à partir d'une dimension pneu */
export function normCleTarif(dimension: string): string {
  if (!dimension?.trim()) return "";
  const raw = dimension.toUpperCase().trim().replace(",", ".");
  if (/4\.50-10/.test(raw)) return "4.50-10";

  const compact = raw.replace(/\s/g, "");
  const r14c = compact.match(/(\d{3})\/R(\d{2})C/);
  if (r14c) return `${r14c[1]}/R${r14c[2]}C`;

  const core = raw.match(/(\d{3}\/\d{2,3}\s*[-]?\s*R\s*\d{1,2}(?:[.,]\d)?\s*C?)/);
  const cleaned = (core?.[1] ?? raw).replace(/\s+/g, " ").trim();

  const r16c = cleaned.match(/(\d{3}\/\d{2})\s*[-]?\s*R\s*(\d{1,2})\s*C\b/);
  if (r16c) return `${r16c[1]} R${r16c[2]}C`;

  const rStd = cleaned.match(/(\d{3}\/\d{2})\s*R\s*(\d{1,2}[.]?\d?)/);
  if (rStd) return `${rStd[1]} R${rStd[2]}`;

  return cleaned.slice(0, 40);
}

export function suggestLot(dimension: string, modele: string): string {
  const d = (dimension || "").toUpperCase();
  const m = (modele || "").toUpperCase();
  if (["400/", "480/", "360/", "385/"].some((x) => d.includes(x))) return "Lot 3";
  if (["R16 C", "R15 C", "R22", "R22.5", "R14C", "/R14", "4.50"].some((x) => d.includes(x))) return "Lot 2";
  if (["EPAREUSE", "CAMION", "BROYEUR", "REMORQUE", "NACELLE", "50C15", "MASTER", "BOXER", "PARTNER"].some((x) => m.includes(x)))
    return "Lot 2";
  return "Lot 1";
}

export type TarifPneuLookup = { lot: string; cleRecherche: string; dimension: string };

/** Style vert quand dimension/lot correspond au BPU pneus */
export const INPUT_TARIF_MATCH =
  "border-green-500 bg-green-50 text-green-900 focus-visible:ring-green-500 dark:bg-green-950/40 dark:text-green-100";

/** Trouve un tarif pneu correspondant à la dimension (tous lots confondus). */
export function findTarifPneuMatch(dimension: string, tarifs: TarifPneuLookup[]): TarifPneuLookup | null {
  const cle = normCleTarif(dimension);
  if (!cle) return null;
  return (
    tarifs.find((t) => t.cleRecherche === cle) ??
    tarifs.find((t) => normCleTarif(t.dimension) === cle) ??
    null
  );
}

/** Lot suggéré : priorité au tarif BPU, sinon règles métier. */
export function lotFromDimension(dimension: string, modele: string, tarifs: TarifPneuLookup[]): string {
  return findTarifPneuMatch(dimension, tarifs)?.lot ?? suggestLot(dimension, modele);
}

/** Vérifie que dimension + lot correspondent à une ligne du BPU pneus. */
export function tarifPneuValide(dimension: string, lot: string, tarifs: TarifPneuLookup[]): boolean {
  const match = findTarifPneuMatch(dimension, tarifs);
  return match !== null && match.lot === lot;
}

import { centreCouvreLot } from "./lots";

/** Filtre les centres prestataires selon le lot véhicule. */
export function filterCentresParLot<T extends { lot: string; lotsCouvert?: string | null }>(
  centres: T[],
  lot: string | null | undefined
): T[] {
  if (!lot?.trim()) return centres;
  return centres.filter((c) => centreCouvreLot(c, lot));
}
