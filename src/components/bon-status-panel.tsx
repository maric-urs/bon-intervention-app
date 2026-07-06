"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Label, Textarea } from "@/components/ui/input";
import { STATUTS, STATUT_LABELS } from "@/lib/utils";
import { Mail, Download } from "lucide-react";

export function BonStatusPanel({
  bonId,
  currentStatut,
  mailto,
}: {
  bonId: number;
  currentStatut: string;
  mailto: string;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(currentStatut);
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);

  async function updateStatut() {
    setLoading(true);
    await fetch(`/api/bons/${bonId}/statut`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut, commentaire }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" variant="secondary" onClick={() => (window.location.href = mailto)}>
          <Mail className="h-4 w-4" />
          Ouvrir dans Outlook
        </Button>
        <a
          href={`/api/bons/${bonId}/export`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Télécharger le bon (.pdf)
        </a>
        <div className="space-y-2">
          <Label>Changer le statut</Label>
          <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Commentaire</Label>
          <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={2} />
        </div>
        <Button className="w-full" onClick={updateStatut} disabled={loading}>
          Mettre à jour le suivi
        </Button>
      </CardContent>
    </Card>
  );
}
