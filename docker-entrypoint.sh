#!/bin/sh
set -e
mkdir -p /data
export DATABASE_URL="file:/data/prod.db"

npx prisma db push

# Seed si jamais fait (base vide créée au build Docker sans données)
if [ ! -f /data/.seeded ]; then
  echo ">> Chargement données initiales (véhicules, tarifs, centres)..."
  npx tsx prisma/seed.ts
  touch /data/.seeded
  echo ">> Seed terminé."
fi

exec "$@"
