/** Prestation BPU déjà incluse dans le prix des pneumatiques neufs. */
export const MONTAGE_PRESTATION = "Montage sur jante";

export type BonLigneLike = {
  type?: string;
  prestation?: string | null;
  emplacement: string;
  dimension: string;
  quantite: number;
  prixUnitHt?: number | null;
  totalHt?: number | null;
};

export function isPneuLigne(l: BonLigneLike) {
  return l.type === "Pneumatique neuf" || (!l.prestation && l.emplacement !== "—");
}

export function ligneTotalHt(l: BonLigneLike) {
  return l.totalHt ?? (l.prixUnitHt ?? 0) * l.quantite;
}

export function formatLignePrestationLabel(l: BonLigneLike) {
  if (isPneuLigne(l)) {
    return `Pneumatique neuf + montage (${l.emplacement})`;
  }
  return l.prestation || l.type || "Prestation";
}

export function formatLigneDetail(l: BonLigneLike) {
  if (isPneuLigne(l)) return l.dimension;
  return "—";
}

export const MONTAGE_INCLUS_NOTE =
  "Le montage sur jante est compris dans le prix des pneumatiques neufs.";
