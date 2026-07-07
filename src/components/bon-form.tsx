"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn, formatEuro, QUANTITE_PNEUS_PAR_EMPACEMENT } from "@/lib/utils";
import { filterCentresParLot, INPUT_TARIF_MATCH } from "@/lib/tarif-utils";
import { MONTAGE_INCLUS_NOTE, MONTAGE_PRESTATION } from "@/lib/bon-lignes";
import { engagementFromLot } from "@/lib/engagement-lots";
import { LotSelect } from "@/components/lot-select";
import { Mail, Plus, Save, Trash2 } from "lucide-react";
import { downloadBonEmail } from "@/lib/download-bon-email";

type Centre = { id: number; nom: string; lot: string; lotsCouvert?: string | null; email: string; emailCc: string | null };
type Lot = { code: string };
type Immat = { immatriculation: string; marque: string; modele: string; lotSuggere: string };
type Prestation = { lot: string; prestation: string; prixRemiseHt: number };
type PneuLine = {
  emplacement: string;
  dimension: string;
  cleTarif: string;
  prixUnitHt: number | null;
  refBpu: string | null;
  selected: boolean;
};
type ExtraPrestationLine = {
  id: string;
  prestation: string;
  prixUnitHt: number;
  quantite: number;
};

type Props = {
  centres: Centre[];
  immatriculations: Immat[];
  prestations: Prestation[];
  lots: Lot[];
};

export function BonForm({ centres, immatriculations, prestations, lots }: Props) {
  const defaultLot = lots[0]?.code || "Lot 1";
  const router = useRouter();
  const [centreId, setCentreId] = useState("");
  const [immat, setImmat] = useState("");
  const [engagement, setEngagement] = useState(() => engagementFromLot(defaultLot));
  const [demandeur, setDemandeur] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [kilometrage, setKilometrage] = useState("");
  const [lot, setLot] = useState(defaultLot);
  const [pneuLines, setPneuLines] = useState<PneuLine[]>([]);
  const [extraPrestations, setExtraPrestations] = useState<ExtraPrestationLine[]>([]);
  const [addPrestaKey, setAddPrestaKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = immatriculations.find((i) => i.immatriculation === immat);
  const selectedPneus = useMemo(() => pneuLines.filter((l) => l.selected), [pneuLines]);

  const prestationsLot = useMemo(() => {
    let list = prestations.filter((p) => p.lot === lot);
    if (selectedPneus.length > 0) {
      list = list.filter((p) => p.prestation !== MONTAGE_PRESTATION);
    }
    return list;
  }, [prestations, lot, selectedPneus]);

  const centresDisponibles = useMemo(() => {
    if (!immat) return centres;
    return filterCentresParLot(centres, lot);
  }, [centres, immat, lot]);

  function onImmatChange(value: string) {
    setImmat(value);
    const vehicle = immatriculations.find((i) => i.immatriculation === value);
    if (vehicle) {
      setLot(vehicle.lotSuggere);
    } else {
      setLot(defaultLot);
      setCentreId("");
    }
  }

  function onLotChange(value: string) {
    setLot(value);
    setCentreId("");
    setExtraPrestations([]);
    setAddPrestaKey("");
  }

  useEffect(() => {
    setEngagement(engagementFromLot(lot));
  }, [lot]);

  useEffect(() => {
    if (centresDisponibles.length === 0) {
      setCentreId("");
      return;
    }
    const ok = centresDisponibles.some((c) => String(c.id) === centreId);
    if (!ok) setCentreId(String(centresDisponibles[0].id));
  }, [centresDisponibles, centreId]);

  useEffect(() => {
    if (!immat) {
      setPneuLines([]);
      return;
    }
    fetch(`/api/vehicles/${encodeURIComponent(immat)}?lot=${encodeURIComponent(lot)}`)
      .then((r) => r.json())
      .then((rows: Omit<PneuLine, "selected">[]) =>
        setPneuLines(rows.map((l) => ({ ...l, selected: true })))
      )
      .catch(() => setPneuLines([]));
  }, [immat, lot]);

  function togglePneu(emplacement: string) {
    setPneuLines((prev) =>
      prev.map((l) => (l.emplacement === emplacement ? { ...l, selected: !l.selected } : l))
    );
  }

  function addPrestation() {
    if (!addPrestaKey) return;
    const tarif = prestationsLot.find((p) => p.prestation === addPrestaKey);
    if (!tarif) return;
    if (extraPrestations.some((e) => e.prestation === tarif.prestation)) return;
    setExtraPrestations((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${tarif.prestation}`,
        prestation: tarif.prestation,
        prixUnitHt: tarif.prixRemiseHt,
        quantite: 1,
      },
    ]);
    setAddPrestaKey("");
  }

  function removePrestation(id: string) {
    setExtraPrestations((prev) => prev.filter((p) => p.id !== id));
  }

  useEffect(() => {
    if (selectedPneus.length > 0) {
      setExtraPrestations((prev) => prev.filter((p) => p.prestation !== MONTAGE_PRESTATION));
    }
  }, [selectedPneus.length]);

  const total = useMemo(() => {
    const pneuTotal = selectedPneus.reduce(
      (s, l) => s + (l.prixUnitHt || 0) * QUANTITE_PNEUS_PAR_EMPACEMENT,
      0
    );
    const prestaTotal = extraPrestations.reduce((s, l) => s + l.prixUnitHt * l.quantite, 0);
    return pneuTotal + prestaTotal;
  }, [selectedPneus, extraPrestations]);

  const lotTarifOk = useMemo(
    () =>
      selectedPneus.length > 0 &&
      selectedPneus.every((l) => !l.dimension?.trim() || l.prixUnitHt != null),
    [selectedPneus]
  );

  function buildLignesPayload() {
    const lignes: Array<{
      type: string;
      prestation?: string;
      emplacement: string;
      dimension: string;
      quantite: number;
      prixUnitHt: number | null;
      refBpu: string | null;
    }> = [];

    for (const l of selectedPneus) {
      lignes.push({
        type: "Pneumatique neuf",
        emplacement: l.emplacement,
        dimension: l.dimension,
        quantite: QUANTITE_PNEUS_PAR_EMPACEMENT,
        prixUnitHt: l.prixUnitHt,
        refBpu: l.refBpu,
      });
    }

    for (const l of extraPrestations) {
      lignes.push({
        type: "Prestation",
        prestation: l.prestation,
        emplacement: "—",
        dimension: "—",
        quantite: l.quantite,
        prixUnitHt: l.prixUnitHt,
        refBpu: null,
      });
    }

    return lignes.map((l, i) => ({ ...l, ordre: i + 1 }));
  }

  async function handleSubmit(andMail = false) {
    setError("");
    const lignes = buildLignesPayload();
    if (lignes.length === 0) {
      setError("Sélectionnez au moins un pneu ou ajoutez une prestation");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centreId: Number(centreId),
          immatriculation: immat,
          marque: selected?.marque || "",
          modele: selected?.modele || "",
          lot,
          numeroEngagement: engagement,
          demandeur,
          notes: commentaire.trim() || null,
          kilometrage: kilometrage ? Number(kilometrage) : null,
          lignes,
          markEnvoye: andMail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (andMail && data.openEmail) {
        await downloadBonEmail(data.id);
      }
      router.push(`/bons/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Immatriculation</Label>
            <Select value={immat} onChange={(e) => onImmatChange(e.target.value)}>
              <option value="">— Choisir —</option>
              {immatriculations.map((i) => (
                <option key={i.immatriculation} value={i.immatriculation}>
                  {i.immatriculation} — {i.marque} {i.modele}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lot</Label>
            <LotSelect
              value={lot}
              onChange={onLotChange}
              lots={lots}
              disabled={!immat}
              className={cn(lotTarifOk && INPUT_TARIF_MATCH)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Centre prestataire</Label>
            <Select
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
              disabled={!immat || centresDisponibles.length === 0}
            >
              {!immat && <option value="">— Choisir une immatriculation d&apos;abord —</option>}
              {immat && centresDisponibles.length === 0 && <option value="">— Aucun centre pour ce lot —</option>}
              {immat &&
                centresDisponibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>N° engagement</Label>
            <Input value={engagement} onChange={(e) => setEngagement(e.target.value)} placeholder="Obligatoire facturation" />
          </div>
          <div className="space-y-2">
            <Label>Kilométrage</Label>
            <Input type="number" value={kilometrage} onChange={(e) => setKilometrage(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Demandeur</Label>
            <Input value={demandeur} onChange={(e) => setDemandeur(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Commentaire</Label>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              placeholder="Instructions ou remarques à faire figurer sur le bon (PDF)"
            />
          </div>
          {selected && (
            <div className="sm:col-span-2 rounded-lg bg-muted/60 p-3 text-sm">
              <strong>{selected.marque}</strong> {selected.modele} — lot suggéré : {selected.lotSuggere}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pneus (fourniture + montage)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pneuLines.length === 0 && (
              <p className="text-sm text-muted-foreground">Choisissez une immatriculation</p>
            )}
            {pneuLines.map((l) => (
              <label
                key={l.emplacement}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors",
                  l.selected && l.dimension?.trim() && l.prixUnitHt != null && "border-green-500 bg-green-50 dark:bg-green-950/40",
                  !l.selected && "opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={l.selected}
                  onChange={() => togglePneu(l.emplacement)}
                />
                <div className="flex-1">
                  <div className="font-medium">{l.emplacement}</div>
                  <div className={cn("text-muted-foreground", l.selected && l.prixUnitHt != null && "text-green-800 dark:text-green-200")}>
                    {l.dimension || "—"}
                  </div>
                  {l.selected && l.prixUnitHt != null && (
                    <div className="mt-1 font-semibold text-[#1F4E79]">
                      {formatEuro(l.prixUnitHt)} × {QUANTITE_PNEUS_PAR_EMPACEMENT} ={" "}
                      {formatEuro(l.prixUnitHt * QUANTITE_PNEUS_PAR_EMPACEMENT)}
                    </div>
                  )}
                </div>
              </label>
            ))}
            {pneuLines.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Décochez AVANT ou ARRIÈRE si non concerné — {QUANTITE_PNEUS_PAR_EMPACEMENT} pneus par essieu.
                {selectedPneus.length > 0 && ` ${MONTAGE_INCLUS_NOTE}`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Autres prestations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!immat && <p className="text-sm text-muted-foreground">Choisissez une immatriculation</p>}
            {immat && prestationsLot.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune prestation BPU pour le {lot}</p>
            )}
            {immat && prestationsLot.length > 0 && (
              <div className="flex gap-2">
                <Select className="flex-1" value={addPrestaKey} onChange={(e) => setAddPrestaKey(e.target.value)}>
                  <option value="">— Prestation —</option>
                  {prestationsLot
                    .filter((p) => !extraPrestations.some((e) => e.prestation === p.prestation))
                    .map((p) => (
                      <option key={p.prestation} value={p.prestation}>
                        {p.prestation} — {formatEuro(p.prixRemiseHt)}
                      </option>
                    ))}
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={addPrestation} disabled={!addPrestaKey}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
            {extraPrestations.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{l.prestation}</div>
                  <div className="text-[#1F4E79] font-semibold">{formatEuro(l.prixUnitHt)}</div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removePrestation(l.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex justify-between font-semibold">
            <span>Total HT</span>
            <span>{formatEuro(total)}</span>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-destructive text-sm lg:col-span-3">{error}</p>}

      <div className="flex flex-wrap gap-3 lg:col-span-3">
        <Button onClick={() => handleSubmit(false)} disabled={loading || !immat || !centreId}>
          <Save className="h-4 w-4" />
          Enregistrer le bon
        </Button>
        <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={loading || !immat || !centreId}>
          <Mail className="h-4 w-4" />
          Enregistrer et préparer l&apos;email Outlook
        </Button>
      </div>
    </div>
  );
}
