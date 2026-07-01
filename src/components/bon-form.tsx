"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { cn, formatEuro } from "@/lib/utils";
import { filterCentresParLot, INPUT_TARIF_MATCH } from "@/lib/tarif-utils";
import { LotSelect } from "@/components/lot-select";
import { Mail, Save } from "lucide-react";

type Centre = { id: number; nom: string; lot: string; lotsCouvert?: string | null; email: string; emailCc: string | null };
type Lot = { code: string };
type Immat = { immatriculation: string; marque: string; modele: string; lotSuggere: string };
type Prestation = { lot: string; prestation: string; prixRemiseHt: number };
type VehicleLine = {
  emplacement: string;
  dimension: string;
  cleTarif: string;
  prixUnitHt: number | null;
  refBpu: string | null;
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
  const [engagement, setEngagement] = useState("");
  const [demandeur, setDemandeur] = useState("");
  const [kilometrage, setKilometrage] = useState("");
  const [lot, setLot] = useState(defaultLot);
  const [lines, setLines] = useState<VehicleLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = immatriculations.find((i) => i.immatriculation === immat);

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
  }

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
      setLines([]);
      return;
    }
    fetch(`/api/vehicles/${encodeURIComponent(immat)}?lot=${encodeURIComponent(lot)}`)
      .then((r) => r.json())
      .then(setLines)
      .catch(() => setLines([]));
  }, [immat, lot]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (l.prixUnitHt || 0), 0),
    [lines]
  );

  const lotTarifOk = useMemo(
    () =>
      lines.length > 0 &&
      lines.every((l) => !l.dimension?.trim() || l.prixUnitHt != null),
    [lines]
  );

  async function handleSubmit(andMail = false) {
    setError("");
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
          kilometrage: kilometrage ? Number(kilometrage) : null,
          lignes: lines.map((l, i) => ({
            ordre: i + 1,
            type: "Pneumatique neuf",
            emplacement: l.emplacement,
            dimension: l.dimension,
            quantite: 1,
            prixUnitHt: l.prixUnitHt,
            refBpu: l.refBpu,
          })),
          markEnvoye: andMail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (andMail && data.mailto) window.location.href = data.mailto;
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
            {!immat && (
              <p className="text-xs text-muted-foreground">
                Choisissez une immatriculation — les centres seront filtrés selon le lot du véhicule
              </p>
            )}
            {immat && (
              <p className="text-xs text-muted-foreground">
                {centresDisponibles.length} centre{centresDisponibles.length > 1 ? "s" : ""} pour le{" "}
                <strong>{lot}</strong>
              </p>
            )}
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
          {selected && (
            <div className="sm:col-span-2 rounded-lg bg-muted/60 p-3 text-sm">
              <strong>{selected.marque}</strong> {selected.modele} — lot suggéré : {selected.lotSuggere}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prestations pneus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.length === 0 && (
            <p className="text-sm text-muted-foreground">Choisissez une immatriculation</p>
          )}
          {lines.map((l) => (
            <div
              key={l.emplacement}
              className={cn(
                "rounded-lg border p-3 text-sm",
                l.dimension?.trim() && l.prixUnitHt != null && "border-green-500 bg-green-50 dark:bg-green-950/40"
              )}
            >
              <div className="font-medium">{l.emplacement}</div>
              <div className={cn("text-muted-foreground", l.prixUnitHt != null && "text-green-800 dark:text-green-200")}>
                {l.dimension || "—"}
              </div>
              <div className="mt-1 font-semibold text-[#1F4E79]">{formatEuro(l.prixUnitHt)}</div>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total HT</span>
            <span>{formatEuro(total)}</span>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm lg:col-span-3">{error}</p>}

      <div className="flex flex-wrap gap-3 lg:col-span-3">
        <Button onClick={() => handleSubmit(false)} disabled={loading || !immat || !centreId}>
          <Save className="h-4 w-4" />
          Enregistrer le bon
        </Button>
        <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={loading || !immat || !centreId}>
          <Mail className="h-4 w-4" />
          Enregistrer et ouvrir Outlook
        </Button>
      </div>
    </div>
  );
}
