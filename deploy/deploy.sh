#!/usr/bin/env bash
# SAVDO-POS — isolated deploy. Does NOT touch other projects on the server.
# Usage (on server, as root or a docker-capable user):
#   cd /opt/savdo-pos && bash deploy/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -p savdo-pos --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml"

if [ ! -f deploy/.env.prod ]; then
  echo "ERROR: deploy/.env.prod yo‘q. Namunadan ko‘chiring va to‘ldiring:"
  echo "  cp deploy/.env.prod.example deploy/.env.prod && nano deploy/.env.prod"
  exit 1
fi

echo "==> Build & up (isolated project 'savdo-pos')"
$COMPOSE up -d --build

echo "==> Wait for backend health"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3010/api/v1/health >/dev/null 2>&1; then
    echo "backend OK"; break
  fi
  sleep 2
done

echo "==> Seed demo data (idempotent)"
$COMPOSE exec -T backend pnpm prisma:seed || echo "seed skipped/failed (non-fatal)"

echo ""
echo "✅ Tayyor."
echo "   Admin panel : http://<SERVER_IP>:8090"
echo "   API (lokal) : http://127.0.0.1:3010/api/v1  (Swagger: /api/v1/docs)"
echo "   Demo: owner login=+998901112233 parol=owner123 | kassir PIN=1234 (staffId seed'da)"
