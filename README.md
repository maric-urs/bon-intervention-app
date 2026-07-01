# Bons d'intervention CACEM — Next.js

Application web dockerisée remplaçant le fichier Excel pour les bons d'intervention pneumatiques (marché **25.061**).

## Fonctionnalités

- **244 véhicules** + tarifs BPU + 6 centres prestataires (même base que l'Excel)
- Création de bon avec dimensions et prix automatiques (AVANT / ARRIÈRE)
- **Suivi des statuts** : Brouillon → Envoyé → En cours → Facturé → Clôturé
- **Historique** par bon
- **Export Excel** — bon individuel (onglet `BON`) ou suivi global (`HISTORIQUE` + référentiels BPU)
- **Ouverture Outlook** (mailto) compatible Outlook entreprise

## Démarrage local

```bash
cd bon-intervention-app
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Ouvrir http://localhost:1899

## Docker

```bash
docker compose up --build
```

Application : http://localhost:1899

La base SQLite est persistée dans le volume `bon_data`.

## Regénérer les données depuis l'Excel

```bash
python scripts/export-seed.py
npm run db:seed
```

## Structure

- `prisma/` — schéma SQLite + seed (véhicules, tarifs, centres)
- `src/app/` — pages et API
- `src/components/` — UI shadcn-style
