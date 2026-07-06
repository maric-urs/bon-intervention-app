import { NextResponse } from "next/server";
import { exportBonEml } from "@/lib/bon-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bonId = Number(id);
  if (!bonId) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const result = await exportBonEml(bonId);
    if (!result) return NextResponse.json({ error: "Bon introuvable" }, { status: 404 });

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "message/rfc822",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("Export bon EML:", e);
    return NextResponse.json({ error: "Échec de la préparation de l'email", detail: message }, { status: 500 });
  }
}
