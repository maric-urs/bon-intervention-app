#!/bin/sh
set -e
mkdir -p /data
export DATABASE_URL="file:/data/prod.db"
if [ ! -f /data/prod.db ]; then
  echo ">> Initialisation base (véhicules, tarifs, centres)..."
  npx prisma db push
  npx tsx prisma/seed.ts
fi
exec "$@"
