/** N° d'engagement marché par lot (marché 25.061). */
export const ENGAGEMENT_PAR_LOT: Record<string, string> = {
  "Lot 1": "ML260098",
  "Lot 2": "ML260100",
  "Lot 3": "ML26000115",
};

export function engagementFromLot(lotCode: string): string {
  return ENGAGEMENT_PAR_LOT[lotCode] ?? "";
}
