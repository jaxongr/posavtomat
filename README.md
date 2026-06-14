# SAVDO-POS

Do'kon (magazin) va restoran/kafe uchun **multi-tenant POS va boshqaruv platformasi**.
Bitta yadro, ikki biznes turi: `DOKON | RESTORAN`.

> Muhandislik qoidalari, taqiqlar, arxitektura — `CLAUDE.md` (yagona manba).

## Monorepo

```
apps/
  backend/   NestJS + Prisma + PostgreSQL + Redis (API + WebSocket + BullMQ)
  admin/     Vite + React + AntD (egasi/menejer paneli)
  pos/       Flutter + Riverpod (kassir/ofitsiant/oshxona — offline-first)
packages/
  shared-types/    API contract, error kodlar, enumlar (backend ↔ admin)
  eslint-config/   umumiy lint qoidalari
```

## Tezkor boshlash (dev)

```bash
# 1. Infratuzilma (Postgres + Redis)
cp .env.example .env
pnpm db:up

# 2. Bog'liqliklar
pnpm install

# 3. Baza (migratsiya + seed)
pnpm db:migrate
pnpm db:seed

# 4. Ishga tushirish
pnpm dev:backend     # http://localhost:3000  (Swagger: /api/v1/docs)
pnpm dev:admin       # http://localhost:5173

# POS (Flutter)
cd apps/pos && flutter pub get && flutter run
```

## Qurilish bosqichlari

| Bosqich | Mazmun | Holat |
|---------|--------|-------|
| 0 | Poydevor (auth, tenant, money, audit, seed) | rejada |
| 1 | Katalog + Ombor | rejada |
| 2 | POS savdo dvigateli (atomik) | rejada |
| 3 | Smena + Chek (X/Z) | rejada |
| 4 | Flutter POS (offline-first) | rejada |
| 5 | Admin panel | rejada |
| 6 | Restoran moduli (KDS, texkarta) | rejada |
| 7 | To'lov integratsiya + Analitika | rejada |
| 8 | Multi-tenant markaz + White-label | rejada |

## MVP qarorlari (skelet)

- **Biznes turi:** ikkalasi teng (neytral yadro)
- **To'lov:** naqd + karta (lokal terminal); Payme/Click/Uzum → 7-bosqich
- **Fiskal:** abstraksiya tayyor, OFD hozircha o'chiq
- **Auth:** mustaqil JWT, markaziy SSO'ga ulanishga tayyor
- **Pul:** `Decimal(14,2)`, UZS; miqdor `Decimal(14,3)` (kg)
- **Tenant:** har query'da `organizationId` (+ `branchId`)
