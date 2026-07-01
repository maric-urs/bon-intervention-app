"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  INPUT_TARIF_MATCH,
  lotFromDimension,
  normCleTarif,
  tarifPneuValide,
  findTarifPneuMatch,
} from "@/lib/tarif-utils";
import { cn } from "@/lib/utils";
import { LotSelect } from "@/components/lot-select";
import { Save, Plus, Trash2, Search } from "lucide-react";

type Lot = {
  id: number;
  code: string;
  description: string | null;
  ordre: number;
  actif: boolean;
};

type Centre = {
  id: number;
  nom: string;
  lot: string;
  lotsCouvert: string | null;
  adresse: string;
  email: string;
  mobile: string | null;
  fixe: string | null;
  emailCc: string | null;
};

type Marche = {
  reference: string;
  consultation: string;
  maitreOuvrage: string;
  objet: string;
  lot1Desc: string | null;
  lot2Desc: string | null;
  lot3Desc: string | null;
  documents: string | null;
};

type TarifPneu = {
  id: number;
  lot: string;
  refBpu: string;
  dimension: string;
  cleRecherche: string;
  marque: string | null;
  prixNeufRemiseHt: number | null;
  remisePct: number | null;
};

type TarifPrestation = {
  id: number;
  lot: string;
  prestation: string;
  prixHt: number;
  remisePct: number;
  prixRemiseHt: number;
};

type Vehicle = {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  emplacement: string;
  dimension: string;
  lotSuggere: string;
  cleTarif: string;
};

type Tab = "marche" | "lots" | "centres" | "pneus" | "prestations" | "vehicules";

const TABS: { id: Tab; label: string }[] = [
  { id: "marche", label: "Marché" },
  { id: "lots", label: "Lots" },
  { id: "centres", label: "Prestataires" },
  { id: "pneus", label: "Tarifs pneus" },
  { id: "prestations", label: "Prestations" },
  { id: "vehicules", label: "Véhicules" },
];

export function SettingsPanel({
  marche,
  lots: initialLots,
  centres: initialCentres,
  tarifsPneus,
  tarifsPrestations,
  vehicles,
}: {
  marche: Marche;
  lots: Lot[];
  centres: Centre[];
  tarifsPneus: TarifPneu[];
  tarifsPrestations: TarifPrestation[];
  vehicles: Vehicle[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("marche");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [marcheForm, setMarcheForm] = useState(marche);
  const [lots, setLots] = useState(initialLots);
  const [centres, setCentres] = useState(initialCentres);
  const lotsActifs = lots.filter((l) => l.actif);
  const defaultLot = lotsActifs[0]?.code || "Lot 1";

  const [newLot, setNewLot] = useState({ code: "", description: "", ordre: "" });

  const [newCentre, setNewCentre] = useState({
    nom: "",
    adresse: "",
    email: "",
    mobile: "",
    fixe: "",
    emailCc: "",
    lotsCouvert: defaultLot,
  });
  const [pneus, setPneus] = useState(tarifsPneus);
  const [prestations, setPrestations] = useState(tarifsPrestations);
  const [vehicules, setVehicules] = useState(vehicles);
  const [vehicleSearch, setVehicleSearch] = useState("");

  const [newPneu, setNewPneu] = useState({
    lot: defaultLot,
    refBpu: "",
    dimension: "",
    cleRecherche: "",
    marque: "DAVANTI",
    prixNeufRemiseHt: "",
    remisePct: "",
  });

  const [newPresta, setNewPresta] = useState({
    lot: defaultLot,
    prestation: "",
    prixHt: "",
    remisePct: "",
    prixRemiseHt: "",
  });

  const [newVehicle, setNewVehicle] = useState({
    immatriculation: "",
    marque: "",
    modele: "",
    dimension: "",
    lotSuggere: defaultLot,
  });

  async function api(path: string, method: string, body?: unknown) {
    setLoading(true);
    setMsg("");
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(err.error || "Erreur");
      return null;
    }
    return res.json();
  }

  async function saveMarche() {
    const data = await api("/api/admin/marche", "PUT", marcheForm);
    if (data) {
      setMsg("Marché enregistré");
      router.refresh();
    }
  }

  async function addLot() {
    const data = await api("/api/admin/lots", "POST", {
      code: newLot.code,
      description: newLot.description,
      ordre: newLot.ordre ? Number(newLot.ordre) : undefined,
    });
    if (data) {
      setLots((prev) => [...prev, data].sort((a, b) => a.ordre - b.ordre));
      setNewLot({ code: "", description: "", ordre: "" });
      setMsg("Lot ajouté");
      router.refresh();
    }
  }

  async function saveLot(row: Lot) {
    const data = await api(`/api/admin/lots/${row.id}`, "PATCH", row);
    if (data) {
      setLots((prev) => prev.map((l) => (l.id === row.id ? data : l)));
      setMsg("Lot mis à jour");
      router.refresh();
    }
  }

  async function deleteLot(id: number) {
    if (!confirm("Supprimer ou désactiver ce lot ?")) return;
    const data = await api(`/api/admin/lots/${id}`, "DELETE");
    if (data) {
      if (data.ok) setLots((prev) => prev.filter((l) => l.id !== id));
      else setLots((prev) => prev.map((l) => (l.id === id ? { ...l, actif: false } : l)));
      setMsg(data.deactivated ? "Lot désactivé (utilisé dans des bons)" : "Lot supprimé");
      router.refresh();
    }
  }

  function centreLotsList(centre: Centre): string[] {
    return (centre.lotsCouvert || "").split(",").map((s) => s.trim()).filter(Boolean);
  }

  function toggleCentreLot(centreId: number, lotCode: string) {
    setCentres((prev) =>
      prev.map((c) => {
        if (c.id !== centreId) return c;
        const current = centreLotsList(c);
        const next = current.includes(lotCode)
          ? current.filter((x) => x !== lotCode)
          : [...current, lotCode];
        return { ...c, lotsCouvert: next.join(",") };
      })
    );
  }

  function updateCentre(id: number, patch: Partial<Centre>) {
    setCentres((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function toggleNewCentreLot(lotCode: string) {
    const current = centreLotsList({ lotsCouvert: newCentre.lotsCouvert } as Centre);
    const next = current.includes(lotCode)
      ? current.filter((x) => x !== lotCode)
      : [...current, lotCode];
    setNewCentre({ ...newCentre, lotsCouvert: next.join(",") });
  }

  async function addCentre() {
    const data = await api("/api/admin/centres", "POST", newCentre);
    if (data) {
      setCentres((prev) => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
      setNewCentre({
        nom: "",
        adresse: "",
        email: "",
        mobile: "",
        fixe: "",
        emailCc: "",
        lotsCouvert: defaultLot,
      });
      setMsg("Prestataire ajouté");
      router.refresh();
    }
  }

  async function saveCentre(centre: Centre) {
    const data = await api(`/api/admin/centres/${centre.id}`, "PATCH", centre);
    if (data) {
      setCentres((prev) => prev.map((c) => (c.id === centre.id ? data : c)));
      setMsg(`Prestataire ${centre.nom} enregistré`);
      router.refresh();
    }
  }

  async function deleteCentre(id: number, nom: string) {
    if (!confirm(`Supprimer le prestataire « ${nom} » ?`)) return;
    const data = await api(`/api/admin/centres/${id}`, "DELETE");
    if (data?.ok) {
      setCentres((prev) => prev.filter((c) => c.id !== id));
      setMsg("Prestataire supprimé");
      router.refresh();
    }
  }

  async function savePneu(row: TarifPneu) {
    const data = await api(`/api/admin/tarifs-pneus/${row.id}`, "PATCH", row);
    if (data) setMsg("Tarif pneu mis à jour");
  }

  async function addPneu() {
    const cle = newPneu.cleRecherche || normCleTarif(newPneu.dimension);
    const data = await api("/api/admin/tarifs-pneus", "POST", {
      ...newPneu,
      cleRecherche: cle,
      prixNeufRemiseHt: newPneu.prixNeufRemiseHt ? Number(newPneu.prixNeufRemiseHt) : null,
      remisePct: newPneu.remisePct ? Number(newPneu.remisePct) : null,
    });
    if (data) {
      setPneus((p) => [...p, data]);
      setNewPneu({ lot: defaultLot, refBpu: "", dimension: "", cleRecherche: "", marque: "DAVANTI", prixNeufRemiseHt: "", remisePct: "" });
      setMsg("Tarif pneu ajouté");
    }
  }

  async function deletePneu(id: number) {
    if (!confirm("Supprimer ce tarif ?")) return;
    const ok = await api(`/api/admin/tarifs-pneus/${id}`, "DELETE");
    if (ok) setPneus((p) => p.filter((x) => x.id !== id));
  }

  async function savePresta(row: TarifPrestation) {
    const data = await api(`/api/admin/tarifs-prestations/${row.id}`, "PATCH", row);
    if (data) setMsg("Prestation mise à jour");
  }

  async function addPresta() {
    const data = await api("/api/admin/tarifs-prestations", "POST", {
      ...newPresta,
      prixHt: Number(newPresta.prixHt),
      remisePct: Number(newPresta.remisePct),
      prixRemiseHt: Number(newPresta.prixRemiseHt),
    });
    if (data) {
      setPrestations((p) => [...p, data]);
      setNewPresta({ lot: defaultLot, prestation: "", prixHt: "", remisePct: "", prixRemiseHt: "" });
      setMsg("Prestation ajoutée");
    }
  }

  async function deletePresta(id: number) {
    if (!confirm("Supprimer cette prestation ?")) return;
    const ok = await api(`/api/admin/tarifs-prestations/${id}`, "DELETE");
    if (ok) setPrestations((p) => p.filter((x) => x.id !== id));
  }

  async function saveVehicle(row: Vehicle) {
    const data = await api(`/api/admin/vehicles/${row.id}`, "PATCH", row);
    if (data) setMsg("Véhicule mis à jour");
  }

  function onNewVehicleDimensionChange(dimension: string) {
    setNewVehicle({
      ...newVehicle,
      dimension,
      lotSuggere: lotFromDimension(dimension, newVehicle.modele, pneus),
    });
  }

  function onNewVehicleModeleChange(modele: string) {
    setNewVehicle({
      ...newVehicle,
      modele,
      lotSuggere: lotFromDimension(newVehicle.dimension, modele, pneus),
    });
  }

  function onVehicleDimensionChange(id: number, dimension: string, modele: string) {
    const cleTarif = normCleTarif(dimension);
    const lotSuggere = lotFromDimension(dimension, modele, pneus);
    setVehicules((v) =>
      v.map((x) => (x.id === id ? { ...x, dimension, cleTarif, lotSuggere } : x))
    );
  }

  function onVehicleModeleChange(id: number, modele: string, dimension: string) {
    const lotSuggere = lotFromDimension(dimension, modele, pneus);
    setVehicules((v) => v.map((x) => (x.id === id ? { ...x, modele, lotSuggere } : x)));
  }

  async function addVehicle() {
    const lot = newVehicle.lotSuggere || lotFromDimension(newVehicle.dimension, newVehicle.modele, pneus);
    const data = await api("/api/admin/vehicles", "POST", { ...newVehicle, lotSuggere: lot });
    if (data) {
      setVehicules((v) => {
        const ids = new Set(v.map((x) => x.id));
        const added = (data as Vehicle[]).filter((x) => !ids.has(x.id));
        return [...v, ...added].sort((a, b) => a.immatriculation.localeCompare(b.immatriculation));
      });
      setNewVehicle({ immatriculation: "", marque: "", modele: "", dimension: "", lotSuggere: defaultLot });
      setMsg("Véhicule ajouté (AVANT + ARRIÈRE)");
      router.refresh();
    }
  }

  async function deleteVehicle(id: number) {
    if (!confirm("Supprimer cette ligne véhicule ?")) return;
    const ok = await api(`/api/admin/vehicles/${id}`, "DELETE");
    if (ok) setVehicules((v) => v.filter((x) => x.id !== id));
  }

  async function searchVehicles() {
    const q = vehicleSearch.trim();
    const url = q ? `/api/admin/vehicles?q=${encodeURIComponent(q)}` : "/api/admin/vehicles";
    const data = await fetch(url).then((r) => r.json());
    setVehicules(data);
  }

  const filteredVehicles = vehicules;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-[#1F4E79] text-white" : "bg-muted hover:bg-muted/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">{msg}</p>}

      {tab === "marche" && (
        <Card>
          <CardHeader>
            <CardTitle>Informations marché</CardTitle>
            <CardDescription>Référence et consultation — gérez les lots dans l&apos;onglet Lots</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Référence marché</Label>
              <Input value={marcheForm.reference} onChange={(e) => setMarcheForm({ ...marcheForm, reference: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>N° consultation</Label>
              <Input value={marcheForm.consultation} onChange={(e) => setMarcheForm({ ...marcheForm, consultation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Maître d&apos;ouvrage</Label>
              <Input value={marcheForm.maitreOuvrage} onChange={(e) => setMarcheForm({ ...marcheForm, maitreOuvrage: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Objet</Label>
              <Textarea rows={2} value={marcheForm.objet} onChange={(e) => setMarcheForm({ ...marcheForm, objet: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Documents BPU</Label>
              <Input value={marcheForm.documents || ""} onChange={(e) => setMarcheForm({ ...marcheForm, documents: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={saveMarche} disabled={loading}>
                <Save className="h-4 w-4" />
                Enregistrer le marché
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "lots" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un lot</CardTitle>
              <CardDescription>Ex. Lot 4 — apparaîtra dans les bons, tarifs et véhicules</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <Input placeholder="Code (ex. Lot 4)" value={newLot.code} onChange={(e) => setNewLot({ ...newLot, code: e.target.value })} />
              <Input className="sm:col-span-2" placeholder="Description" value={newLot.description} onChange={(e) => setNewLot({ ...newLot, description: e.target.value })} />
              <Button onClick={addLot} disabled={loading || !newLot.code.trim()}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2">Code</th>
                    <th className="pb-2 pr-2">Description</th>
                    <th className="pb-2 pr-2">Ordre</th>
                    <th className="pb-2 pr-2">Actif</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((row) => (
                    <tr key={row.id} className={`border-b ${!row.actif ? "opacity-50" : ""}`}>
                      <td className="py-2 pr-2">
                        <Input className="w-24" value={row.code} onChange={(e) => setLots((p) => p.map((x) => (x.id === row.id ? { ...x, code: e.target.value } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="min-w-[240px]" value={row.description || ""} onChange={(e) => setLots((p) => p.map((x) => (x.id === row.id ? { ...x, description: e.target.value } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="w-16" type="number" value={row.ordre} onChange={(e) => setLots((p) => p.map((x) => (x.id === row.id ? { ...x, ordre: Number(e.target.value) } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="checkbox" checked={row.actif} onChange={(e) => setLots((p) => p.map((x) => (x.id === row.id ? { ...x, actif: e.target.checked } : x)))} />
                      </td>
                      <td className="py-2 flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => saveLot(row)} disabled={loading}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteLot(row.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "centres" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un prestataire</CardTitle>
              <CardDescription>Nouveau centre Pneu Cash, SOMAREC, etc.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Nom du centre *" value={newCentre.nom} onChange={(e) => setNewCentre({ ...newCentre, nom: e.target.value })} />
              <Input placeholder="Email centre *" type="email" value={newCentre.email} onChange={(e) => setNewCentre({ ...newCentre, email: e.target.value })} />
              <Input className="sm:col-span-2" placeholder="Adresse *" value={newCentre.adresse} onChange={(e) => setNewCentre({ ...newCentre, adresse: e.target.value })} />
              <Input placeholder="Mobile" value={newCentre.mobile} onChange={(e) => setNewCentre({ ...newCentre, mobile: e.target.value })} />
              <Input placeholder="Téléphone fixe" value={newCentre.fixe} onChange={(e) => setNewCentre({ ...newCentre, fixe: e.target.value })} />
              <Input className="sm:col-span-2" placeholder="Email copie coordination" value={newCentre.emailCc} onChange={(e) => setNewCentre({ ...newCentre, emailCc: e.target.value })} />
              <div className="sm:col-span-2">
                <Label className="mb-2 block">Lots pris en charge *</Label>
                <div className="flex flex-wrap gap-4">
                  {lotsActifs.map((lot) => (
                    <label key={lot.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={centreLotsList({ lotsCouvert: newCentre.lotsCouvert } as Centre).includes(lot.code)}
                        onChange={() => toggleNewCentreLot(lot.code)}
                      />
                      {lot.code}
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Button onClick={addCentre} disabled={loading || !newCentre.nom || !newCentre.email || !newCentre.adresse || !newCentre.lotsCouvert}>
                  <Plus className="h-4 w-4" />
                  Ajouter le prestataire
                </Button>
              </div>
            </CardContent>
          </Card>

          {centres.map((centre) => (
            <Card key={centre.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{centre.nom}</CardTitle>
                <CardDescription>Libellé lot : {centre.lot}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nom</Label>
                  <Input value={centre.nom} onChange={(e) => updateCentre(centre.id, { nom: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={centre.email} onChange={(e) => updateCentre(centre.id, { email: e.target.value })} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Adresse</Label>
                  <Input value={centre.adresse} onChange={(e) => updateCentre(centre.id, { adresse: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Mobile</Label>
                  <Input value={centre.mobile || ""} onChange={(e) => updateCentre(centre.id, { mobile: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Fixe</Label>
                  <Input value={centre.fixe || ""} onChange={(e) => updateCentre(centre.id, { fixe: e.target.value })} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Copie coordination (CC)</Label>
                  <Input value={centre.emailCc || ""} onChange={(e) => updateCentre(centre.id, { emailCc: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-2 block">Lots pris en charge</Label>
                  <div className="flex flex-wrap gap-4">
                    {lotsActifs.map((lot) => (
                      <label key={lot.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={centreLotsList(centre).includes(lot.code)}
                          onChange={() => toggleCentreLot(centre.id, lot.code)}
                        />
                        {lot.code}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button size="sm" onClick={() => saveCentre(centre)} disabled={loading}>
                    <Save className="h-4 w-4" />
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteCentre(centre.id, centre.nom)} disabled={loading}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "pneus" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un tarif pneu</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <LotSelect value={newPneu.lot} onChange={(lot) => setNewPneu({ ...newPneu, lot })} lots={lotsActifs} />
              <Input placeholder="Réf BPU" value={newPneu.refBpu} onChange={(e) => setNewPneu({ ...newPneu, refBpu: e.target.value })} />
              <Input
                placeholder="Dimension"
                className="sm:col-span-2"
                value={newPneu.dimension}
                onChange={(e) =>
                  setNewPneu({
                    ...newPneu,
                    dimension: e.target.value,
                    cleRecherche: normCleTarif(e.target.value),
                  })
                }
              />
              <Input placeholder="Prix remisé HT" value={newPneu.prixNeufRemiseHt} onChange={(e) => setNewPneu({ ...newPneu, prixNeufRemiseHt: e.target.value })} />
              <Button onClick={addPneu} disabled={loading}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2">Lot</th>
                    <th className="pb-2 pr-2">Réf</th>
                    <th className="pb-2 pr-2">Dimension</th>
                    <th className="pb-2 pr-2">Clé</th>
                    <th className="pb-2 pr-2">Prix remisé</th>
                    <th className="pb-2 pr-2">Remise %</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pneus.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-2">
                        <LotSelect
                          className="min-w-[80px]"
                          value={row.lot}
                          onChange={(lot) => setPneus((p) => p.map((x) => (x.id === row.id ? { ...x, lot } : x)))}
                          lots={lotsActifs}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="w-16" value={row.refBpu} onChange={(e) => setPneus((p) => p.map((x) => (x.id === row.id ? { ...x, refBpu: e.target.value } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="min-w-[140px]" value={row.dimension} onChange={(e) => setPneus((p) => p.map((x) => (x.id === row.id ? { ...x, dimension: e.target.value, cleRecherche: normCleTarif(e.target.value) } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="min-w-[100px]" value={row.cleRecherche} onChange={(e) => setPneus((p) => p.map((x) => (x.id === row.id ? { ...x, cleRecherche: e.target.value } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="w-20" type="number" step="0.01" value={row.prixNeufRemiseHt ?? ""} onChange={(e) => setPneus((p) => p.map((x) => (x.id === row.id ? { ...x, prixNeufRemiseHt: e.target.value ? Number(e.target.value) : null } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="w-16" type="number" step="0.01" value={row.remisePct ?? ""} onChange={(e) => setPneus((p) => p.map((x) => (x.id === row.id ? { ...x, remisePct: e.target.value ? Number(e.target.value) : null } : x)))} />
                      </td>
                      <td className="py-2 flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => savePneu(row)} disabled={loading}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePneu(row.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "prestations" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une prestation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-5">
              <LotSelect value={newPresta.lot} onChange={(lot) => setNewPresta({ ...newPresta, lot })} lots={lotsActifs} />
              <Input className="sm:col-span-2" placeholder="Libellé prestation" value={newPresta.prestation} onChange={(e) => setNewPresta({ ...newPresta, prestation: e.target.value })} />
              <Input placeholder="Prix remisé HT" value={newPresta.prixRemiseHt} onChange={(e) => setNewPresta({ ...newPresta, prixRemiseHt: e.target.value })} />
              <Button onClick={addPresta} disabled={loading}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2">Lot</th>
                    <th className="pb-2 pr-2">Prestation</th>
                    <th className="pb-2 pr-2">Prix cat.</th>
                    <th className="pb-2 pr-2">Remise %</th>
                    <th className="pb-2 pr-2">Prix remisé</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {prestations.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-2">
                        <LotSelect
                          value={row.lot}
                          onChange={(lot) => setPrestations((p) => p.map((x) => (x.id === row.id ? { ...x, lot } : x)))}
                          lots={lotsActifs}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="min-w-[200px]" value={row.prestation} onChange={(e) => setPrestations((p) => p.map((x) => (x.id === row.id ? { ...x, prestation: e.target.value } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="w-20" type="number" step="0.01" value={row.prixHt} onChange={(e) => setPrestations((p) => p.map((x) => (x.id === row.id ? { ...x, prixHt: Number(e.target.value) } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="w-16" type="number" step="0.01" value={row.remisePct} onChange={(e) => setPrestations((p) => p.map((x) => (x.id === row.id ? { ...x, remisePct: Number(e.target.value) } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="w-20" type="number" step="0.01" value={row.prixRemiseHt} onChange={(e) => setPrestations((p) => p.map((x) => (x.id === row.id ? { ...x, prixRemiseHt: Number(e.target.value) } : x)))} />
                      </td>
                      <td className="py-2 flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => savePresta(row)} disabled={loading}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePresta(row.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "vehicules" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un véhicule</CardTitle>
              <CardDescription>Crée automatiquement les lignes AVANT et ARRIÈRE</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Input placeholder="Immatriculation" value={newVehicle.immatriculation} onChange={(e) => setNewVehicle({ ...newVehicle, immatriculation: e.target.value })} />
              <Input placeholder="Marque" value={newVehicle.marque} onChange={(e) => setNewVehicle({ ...newVehicle, marque: e.target.value })} />
              <Input placeholder="Modèle" value={newVehicle.modele} onChange={(e) => onNewVehicleModeleChange(e.target.value)} />
              <Input
                placeholder="Dimension pneu"
                className={cn(
                  "sm:col-span-2",
                  newVehicle.dimension && findTarifPneuMatch(newVehicle.dimension, pneus) && INPUT_TARIF_MATCH
                )}
                value={newVehicle.dimension}
                onChange={(e) => onNewVehicleDimensionChange(e.target.value)}
              />
              <LotSelect
                value={newVehicle.lotSuggere}
                onChange={(lotSuggere) => setNewVehicle({ ...newVehicle, lotSuggere })}
                lots={lotsActifs}
                className={cn(
                  tarifPneuValide(newVehicle.dimension, newVehicle.lotSuggere, pneus) && INPUT_TARIF_MATCH
                )}
              />
              <Button onClick={addVehicle} disabled={loading}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Input placeholder="Rechercher immat, marque, modèle…" value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchVehicles()} />
            <Button variant="outline" onClick={searchVehicles}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2">Immat</th>
                    <th className="pb-2 pr-2">Marque</th>
                    <th className="pb-2 pr-2">Modèle</th>
                    <th className="pb-2 pr-2">Emp.</th>
                    <th className="pb-2 pr-2">Dimension</th>
                    <th className="pb-2 pr-2">Lot</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-2">
                        <Input className="w-24" value={row.immatriculation} onChange={(e) => setVehicules((v) => v.map((x) => (x.id === row.id ? { ...x, immatriculation: e.target.value } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input className="w-20" value={row.marque} onChange={(e) => setVehicules((v) => v.map((x) => (x.id === row.id ? { ...x, marque: e.target.value } : x)))} />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="w-24"
                          value={row.modele}
                          onChange={(e) => onVehicleModeleChange(row.id, e.target.value, row.dimension)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select className="w-24" value={row.emplacement} onChange={(e) => setVehicules((v) => v.map((x) => (x.id === row.id ? { ...x, emplacement: e.target.value } : x)))}>
                          <option>AVANT</option>
                          <option>ARRIERE</option>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className={cn(
                            "min-w-[130px]",
                            row.dimension && findTarifPneuMatch(row.dimension, pneus) && INPUT_TARIF_MATCH
                          )}
                          value={row.dimension}
                          onChange={(e) => onVehicleDimensionChange(row.id, e.target.value, row.modele)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <LotSelect
                          className={cn(
                            "w-24",
                            tarifPneuValide(row.dimension, row.lotSuggere, pneus) && INPUT_TARIF_MATCH
                          )}
                          value={row.lotSuggere}
                          onChange={(lotSuggere) => setVehicules((v) => v.map((x) => (x.id === row.id ? { ...x, lotSuggere } : x)))}
                          lots={lotsActifs}
                        />
                      </td>
                      <td className="py-2 flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => saveVehicle(row)} disabled={loading}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteVehicle(row.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-4">{filteredVehicles.length} lignes affichées (max 500)</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
