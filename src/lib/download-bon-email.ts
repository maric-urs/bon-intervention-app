/** Télécharge un fichier .eml (brouillon Outlook avec PDF en pièce jointe). */
export async function downloadBonEmail(bonId: number) {
  const res = await fetch(`/api/bons/${bonId}/eml`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Impossible de préparer l'email");
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  const filename = cd?.match(/filename="([^"]+)"/)?.[1] ?? `Bon-intervention-${bonId}.eml`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
