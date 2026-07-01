import Link from "next/link";
import { FileText, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportExcelButton } from "@/components/export-excel-button";
import { getMarcheConfig } from "@/lib/marche";

export async function AppHeader() {
  const marche = await getMarcheConfig();

  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[#1F4E79]">
          <FileText className="h-6 w-6" />
          <div>
            <div>Bons d&apos;intervention CACEM</div>
            <div className="text-xs font-normal text-muted-foreground">
              Marché {marche.reference} — Pneumatiques
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/parametres" title="Paramètres">
            <Button variant="ghost" size="sm" className="px-2">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Paramètres</span>
            </Button>
          </Link>
          <ExportExcelButton />
          <Link href="/nouveau">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nouveau bon
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
