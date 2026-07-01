"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportExcelButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/export/xlsx");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur serveur (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || "export-bons.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du téléchargement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={download} disabled={loading}>
        <Download className="h-4 w-4" />
        {loading ? "Export…" : "Export Excel"}
      </Button>
      {error && <span className="text-xs text-destructive max-w-[200px] text-right">{error}</span>}
    </div>
  );
}
