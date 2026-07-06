import { NextResponse } from "next/server";
import { exportBonPdf } from "@/lib/pdf-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bonId = Number(id);
  if (!bonId) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const result = await exportBonPdf(bonId);
    if (!result) return NextResponse.json({ error: "Bon introuvable" }, { status: 404 });

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (e) {
    console.error("Export bon PDF:", e);
    return NextResponse.json({ error: "Échec de l'export PDF" }, { status: 500 });
  }
}
