import { NextResponse } from "next/server";
import { exportSuiviXlsx } from "@/lib/xlsx-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const { buffer, filename } = await exportSuiviXlsx();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("Export XLSX:", e);
    return NextResponse.json({ error: "Échec de l'export Excel" }, { status: 500 });
  }
}
