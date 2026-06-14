# CLAUDE.md — Master Project Rules
# Loyiha: SAVDO-POS — Do'kon & Restoran avtomatlashtirish platformasi (POS + boshqaruv)
# Bu fayl Claude Code uchun — har safar o'qiladi
# Yangi pattern/qoida qo'shilsa — DARHOL yangilang

---

## 🎯 LOYIHA NIMA QILADI (single source of truth)

SAVDO-POS — do'kon (magazin) va restoran/kafe kabi joylarni to'liq
avtomatlashtiruvchi MULTI-TENANT platforma. Bitta yadro, ikki biznes turi:

```
BUSINESS_TYPE = DOKON | RESTORAN   (tashkilot sozlamasida tanlanadi)

UMUMIY YADRO (ikkalasi uchun):
  catalog      → mahsulot/menyu (kategoriya, variant, modifikator, barkod)
  inventory    → ombor/qoldiq, kirim-chiqim, inventarizatsiya
  suppliers    → yetkazib beruvchilar + xarid (kirim)
  pos / sales  → kassa savdo, chek, qaytarish (vozvrat)
  payments     → Payme/Click/Uzum/naqd/karta
  discounts    → chegirma, aksiya, promokod
  customers    → mijoz bazasi + sodiqlik (loyalty/ball)
  shifts       → kassa smenasi (ochish/yopish, X/Z hisobot)
  reports      → savdo, qoldiq, foyda/ziyon, ABC tahlil
  staff        → hodim + rollar (RBAC)
  printing     → chek / yorliq / oshxona chipta (KOT) chop etish

RESTORAN QO'SHIMCHA:
  tables       → zal/stol boshqaruvi, band/bo'sh, birlashtirish
  kitchen      → oshxona ekrani (KDS) + KOT, taom holati
  recipes      → texkarta (taom → ingredient) → avto qoldiq kamayishi
  service      → ofitsiant chaqirish, hisob bo'lish (split bill)

DOKON QO'SHIMCHA:
  barcode      → barkod skaner orqali tez savdo
  weighing     → tarozi mahsulot (kg narx)
  batch/expiry → partiya va yaroqlilik muddati nazorati
```

**Asosiy oqim (do'kon):**
`kassir → barkod skan / mahsulot tanlash → savat → chegirma → to'lov (naqd/karta/Payme)
→ chek chop → qoldiq avto kamayadi → smena hisobotiga tushadi`

**Asosiy oqim (restoran):**
`ofitsiant → stol tanlaydi → menyudan taom (modifikator bilan) → oshxonaga (KOT)
→ oshxona tayyorlaydi (KDS) → hisob → to'lov → stol bo'shaydi → ingredient qoldig'i kamayadi`

> Bu platforma markaziy ekotizimga ulanadi (multi-tenant): har biznes =
> bitta `organizationId`, egasi markaziy paneldan barcha filial/biznesni nazorat qiladi.

---

## 🏗️ TECH STACK

| Layer    | Stack                                                  |
|----------|--------------------------------------------------------|
| Backend  | NestJS + Prisma + PostgreSQL + Redis                   |
| Admin    | Vite + React + AntD + Styled-components + TS           |
| POS/Mobile | Flutter + Riverpod + GoRouter (tablet/telefon kassa) |
| Realtime | WebSocket/SSE (oshxona ekrani, stol holati, KDS)       |
| Queue    | BullMQ (Redis) — print, sync, report, notify           |
| Auth     | JWT (access 15min + refresh 7d) + RBAC + PIN (kassir)  |
| Cache    | Redis (multi-level)                                    |
| Payments | Payme + Click + Uzum + fiskal modul (chek)             |
| Docs     | Swagger (auto-generated)                               |
| Tenant   | har asosiy jadval: organizationId + branchId           |

> Pul/qoldiq qiymati: `Decimal` yoki butun son (tiyin). `float` MUTLAQ TAQIQ.

---

## 🔴 UNIVERSAL TAQIQLAR — hamma joyda, istisnasiz

```
❌ TODO / FIXME / HACK komentar — darhol hal qil
❌ console.log / print — logger ishlatilsin
❌ Hardcoded secret, URL, credential, terminal/fiskal kalit
❌ any tipi (TypeScript) — MUTLAQ TAQIQ
❌ Mock data production codeda
❌ N+1 query — Prisma include/select ishlatilsin
❌ Untested critical path (savdo, to'lov, qoldiq, smena) — test yozilsin
❌ offset-based pagination — cursor-based ishlatilsin
❌ Pul/qoldiq hisobida float yoki taxminiy yaxlitlash
❌ Tenant scope'siz query (organizationId/branchId YO'Q) — TAQIQ
```

---

## ✅ UNIVERSAL MAJBURIYLAR — hamma joyda

```
✅ Conventional commits: feat/fix/refactor/chore/docs/test
✅ Har yangi funksiya — Swagger yoki docstring
✅ Error har doim typed (custom Error class)
✅ Environment variables — .env.example yangilansin
✅ Har yangi endpoint — integration test
✅ Coverage minimum: 70% (savdo/to'lov/qoldiq/smena oqimi: 90%)
✅ Har savdo/to'lov/qoldiq harakati — audit log + idempotent
✅ Har query — tenant scope (organizationId + branchId)
✅ UI/matn o'zbekcha (i18n), kod izohlari inglizcha
```

---

## 📡 API CONTRACT

### Endpoint format
```
GET    /api/v1/{resource}
POST   /api/v1/{resource}
PATCH  /api/v1/{resource}/:id
DELETE /api/v1/{resource}/:id
```

### Response format — BARCHA endpointlar
```typescript
// Muvaffaqiyatli
{ data: T | T[], meta?: { total: number, cursor?: string, hasNext: boolean } }
// Xato
{ error: { code: string, message: string, details?: object } }
```

### Error kodlar
```
E1001 — Unauthorized            E2001 — Resource not found
E1002 — Forbidden (RBAC)        E2002 — Already exists
E1003 — Token expired           E2003 — Business logic violation
E3001 — Validation error        E5001 — Internal server error
— Domain-specific —
E4001 — Payment failed          E4002 — Payment pending
E4010 — Order already paid       E4011 — Refund exceeds paid amount
E4101 — Insufficient stock (qoldiq yetarli emas)
E4102 — Product not in catalog / inactive
E4201 — Table occupied (stol band)
E4202 — Order not sent to kitchen
E4301 — Shift not open (smena ochilmagan)
E4302 — Shift already closed
E4401 — Discount not applicable (shart bajarilmadi)
E4501 — Receipt/fiscal print failed
```

### Pagination — cursor-based (offset TAQIQ)
```
GET /api/v1/products?cursor=<last_id>&limit=20&direction=next
```

---

## 🔐 SECURITY STANDARTLARI

```
- Access token:  15 daqiqa
- Refresh token: 7 kun, HttpOnly cookie
- Kassir kirishi: PIN-kod (tez almashuv) — backend tomonda tekshiriladi
- RBAC:          @Roles() decorator har protected endpointda
- Tenant guard:  @Tenant() — har so'rovda organizationId/branchId tekshiriladi
- Validation:    class-validator har DTO da majburiy
- Rate limiting: /auth/* → 5 req/min | global → 100 req/min
- CORS:          whitelist only       | Helmet: majburiy
- Secrets:       Vault / env — kodda HECH QACHON (fiskal/terminal kalit ham)
- Pul harakati:  idempotency-key MAJBURIY (double-charge YO'Q)
- Foyda/tannarx ko'rinishi: rolga bog'liq (kassir tannarxni ko'rmaydi — config)
```

---

## 📊 PERFORMANCE BUDGETLAR

```
API response time:     < 200ms (p95)
DB query time:         < 50ms  (p95)
Redis cache hit rate:  > 80%
POS savdo yakuni:      < 300ms (chek tugmasidan to'lovgacha — tez bo'lishi shart)
KDS / stol yangilanishi: < 1s (realtime WebSocket)
Flutter first paint:   < 1.5s
Admin bundle size:     < 500KB (gzipped)
```

---

## 📝 COMMIT FORMAT

```
feat(pos): add barcode scan to cart
fix(inventory): prevent stock going negative on sale
refactor(tables): extract table-merge logic
feat(kitchen): KDS realtime order status via websocket
feat(recipes): deduct ingredients on dish sale
docs(api): swagger for shift close (Z-report)
test(sales): idempotent payment + stock deduction test
```

---

## 🌍 ENVIRONMENT

```
Muhitlar: development | staging | production
Har yangi env: 1) .env.example  2) config/configuration.ts  3) README

Kritik env'lar:
DATABASE_URL, REDIS_URL, JWT_SECRET, ENCRYPTION_KEY,
PAYME_MERCHANT_ID, PAYME_KEY, CLICK_*, UZUM_*,
FISCAL_PROVIDER_URL, FISCAL_TOKEN,           // chek/fiskal modul (agar bor bo'lsa)
PRINTER_GATEWAY_URL,                          // chek/KOT printer
DEFAULT_CURRENCY (UZS)
```

---

## 🧪 TEST STANDARTLARI

```
Unit:        har service/usecase (ayniqsa narx/qoldiq/foyda/smena hisoblari)
Integration: har endpoint + WebSocket event
E2E:         kritik flow — savdo→to'lov→qoldiq→chek, restoran: stol→KOT→hisob,
             smena ochish→savdo→Z-hisobot
Naming: describe('ServiceName') > it('should do X when Y')
Savdo/to'lov/qoldiq/smena oqimida coverage 90%+
```

---
---

# ═══════════════════════════════════
# BACKEND — NestJS + Prisma + Redis
# ═══════════════════════════════════

## 🏗️ MODUL STRUKTURASI

```
src/
├── modules/
│   ├── organizations/   ← tenant (biznes) + sozlama (DOKON|RESTORAN)
│   ├── branches/        ← filiallar
│   ├── staff/           ← hodim + RBAC + PIN
│   ├── catalog/         ← mahsulot/menyu, kategoriya, variant, modifikator
│   ├── inventory/       ← qoldiq, kirim-chiqim, inventarizatsiya
│   ├── suppliers/       ← yetkazib beruvchi + xarid
│   ├── sales/           ← POS savdo / buyurtma, chek, qaytarish
│   ├── tables/          ← (RESTORAN) zal/stol
│   ├── kitchen/         ← (RESTORAN) KOT + KDS (realtime)
│   ├── recipes/         ← (RESTORAN) texkarta → ingredient depletion
│   ├── payments/        ← Payme/Click/Uzum/naqd + fiskal
│   ├── discounts/       ← chegirma/aksiya/promokod
│   ├── customers/       ← mijoz + loyalty
│   ├── shifts/          ← kassa smenasi, X/Z hisobot
│   ├── reports/         ← savdo/qoldiq/foyda analitika
│   └── printing/        ← chek/KOT/yorliq chop (queue)
├── common/
│   ├── filters/         ← GlobalExceptionFilter
│   ├── guards/          ← JwtAuthGuard, RolesGuard, TenantGuard
│   ├── decorators/      ← @CurrentUser(), @Roles(), @Tenant()
│   ├── interceptors/    ← LoggingInterceptor, TransformInterceptor
│   ├── money/           ← Money helper (yaxlitlash qoidasi markaziy)
│   ├── realtime/        ← WebSocket gateway (KDS, stol holati)
│   └── pipes/           ← ValidationPipe
├── config/
└── prisma/              ← PrismaService, migrations
```

## 📐 CONTROLLER QOIDASI

```typescript
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiTags('sales')
export class SalesController {
  // ✅ Faqat HTTP layer — validation, auth, tenant, response
  // ✅ Biznes logika YO'Q — servicedan chaqiriladi
  @Post()
  @Roles(Role.CASHIER, Role.WAITER, Role.MANAGER)
  @ApiOperation({ summary: 'Savdo/buyurtma yaratish' })
  async create(@Body() dto: CreateSaleDto, @CurrentUser() user: UserEntity,
               @Tenant() ctx: TenantContext) {
    return this.salesService.create(dto, user, ctx);
  }
}
```

## ⚙️ SERVICE QOIDASI

```typescript
@Injectable()
export class CatalogService {
  async findAll(query: PaginationDto, ctx: TenantContext) {
    const key = `catalog:${ctx.orgId}:${ctx.branchId}:${query.cursor ?? 'first'}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    const products = await this.catalogRepository.findMany(query, ctx);
    await this.redis.setex(key, 600, JSON.stringify(products));
    return products;
  }
}
```

> **Savdo (sale) — atomik tranzaksiya:** chek yaratish + qoldiq kamaytirish +
> to'lov + (restoran: ingredient depletion) bitta DB transaction ichida.
> Idempotency-key bilan. Qoldiq yetmasa → E4101, butun savdo bekor (rollback).

## 🗄️ REPOSITORY (Prisma) QOIDASI

```typescript
// ✅ cursor-based, ✅ faqat kerakli fieldlar, ✅ tenant scope, ❌ select *
async findMany(query: PaginationDto, ctx: TenantContext) {
  return this.prisma.product.findMany({
    where: { organizationId: ctx.orgId, active: true, categoryId: query.categoryId },
    select: {
      id: true, name: true, price: true, barcode: true, unit: true,
      imageUrl: true,
      stock: { where: { branchId: ctx.branchId }, select: { quantity: true } },
    },
    take: query.limit + 1,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    orderBy: { name: 'asc' },
  });
}
```

## 🔴 DTO QOIDASI

```typescript
export class CreateSaleDto {
  @IsEnum(SaleType)                          // POS | DINE_IN | TAKEAWAY | DELIVERY
  @ApiProperty({ example: 'POS' })
  type: SaleType;

  @IsOptional() @IsUUID()
  tableId?: string;                          // restoran: stol

  @IsArray() @ValidateNested({ each: true }) @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsOptional() @IsUUID()
  customerId?: string;

  @IsOptional() @IsString()
  promoCode?: string;
}

export class SaleItemDto {
  @IsUUID() productId: string;
  @IsNumber() @Min(0.001) qty: number;       // do'kon: kg uchun kasr bo'lishi mumkin
  @IsOptional() @IsArray() modifierIds?: string[]; // restoran: modifikator
}
```

## ⚠️ GLOBAL EXCEPTION FILTER

```
// BARCHA xatoliklar GlobalExceptionFilter orqali → { error: { code, message, details? } }
// Custom: throw new BusinessException('E4101', 'Qoldiq yetarli emas');
// To'lov/fiskal xatosi → typed (PaymentError, FiscalError) + retry policy
```

## 🗄️ PRISMA / DATABASE QOIDALARI

```
✅ Index: FK (organizationId, branchId, productId, categoryId, saleId),
   filter (active, barcode, createdAt, status),
   composite (organizationId+branchId+active, branchId+productId [stock])
✅ Migration naming: YYYYMMDD_description
✅ Soft delete: deletedAt | Timestamps: createdAt, updatedAt | UUID id
✅ Money: Decimal(14,2) yoki BigInt (tiyin)
✅ Stock: alohida jadval (branchId+productId unique) — qoldiq filial bo'yicha
❌ Raw SQL (extreme case), ❌ select *, ❌ N+1, ❌ float money, ❌ negativ qoldiq
```

### Asosiy modellar (minimal sxema)
```
Organization(id, name, businessType[DOKON|RESTORAN], settings[Json])
Branch(id, orgId, name, address)
Staff(id, orgId, branchId?, fish, role, pinHash, passwordHash, active)
Category(id, orgId, name, parentId?, sort)
Product(id, orgId, name, categoryId, sku?, barcode?, unit[DONA|KG|PORSIYA],
        price, cost, type[GOODS|DISH|INGREDIENT], active, imageUrl)
ProductVariant(id, productId, name, priceDelta)          // o'lcham/rang
Modifier(id, orgId, name, priceDelta, group)             // restoran: qo'shimcha
Recipe(id, dishProductId) ── RecipeItem(id, recipeId, ingredientId, qty)
Stock(id, orgId, branchId, productId, quantity)          // qoldiq (branch+product uniq)
StockMovement(id, branchId, productId, type[IN|OUT|ADJUST|SALE|WASTE], qty, ref)
Supplier(id, orgId, name, phone)
Purchase(id, orgId, branchId, supplierId, total, status) ── PurchaseItem(...)
DiningTable(id, orgId, branchId, name, zone, status[FREE|OCCUPIED|BILL])
Sale(id, orgId, branchId, staffId, type, tableId?, customerId?, status,
     subtotal, discount, total, paidStatus, createdAt)
SaleItem(id, saleId, productId, variantId?, qty, price, cost, modifiers[Json])
Kot(id, saleId, status[NEW|COOKING|READY|SERVED], items[Json])   // restoran
Payment(id, saleId, provider, amount, status, externalId, idempotencyKey)
Discount(id, orgId, name, type[PERCENT|FIXED], value, conditions[Json], active)
Customer(id, orgId, fish, phone, loyaltyPoints)
Shift(id, orgId, branchId, staffId, openedAt, closedAt?, openCash, closeCash,
      totalSales, status[OPEN|CLOSED])
AuditLog(id, staffId, action, entity, old, new, at)
```

## 🔴 REDIS CACHE STRATEGIYASI

```typescript
// Key: {module}:{orgId}:{branchId}:{variant}
// TTL: catalog 600s | product detail 600s | tables 30s (realtime invalidate)
//      reports 600s | shift current 60s
// Invalidation: savdo/kirim → redis.del(`catalog:${orgId}:${branchId}:*`)
//               + `stock:${branchId}:${productId}` yangilanadi
```

## 📊 LOGGING (Backend)

```typescript
private readonly logger = new Logger(SalesService.name);
this.logger.log(`Sale completed: ${saleId} total=${total} branch=${branchId}`);
this.logger.warn(`Low stock: product=${productId} qty=${qty}`);
this.logger.error(`Fiscal print failed`, err.stack);
// ❌ console.log TAQIQ
```

## 🔒 SCALABILITY (ko'p filial / ko'p biznes)

```
✅ Multi-tenant modular arxitektura (orgId/branchId hamma joyda)
✅ DB: indexing, pooling, read replica (reports), per-branch stock
✅ Stateless API + WebSocket sticky/Redis pub-sub (KDS scale)
✅ Multi-level caching + invalidation + warming
✅ Offline-tolerant POS (mobil tomonda — pastga qara)
✅ Monitoring: Winston + Sentry + health checks
✅ Backup & disaster recovery (savdo ma'lumoti — kritik)
```

---
---

# ═══════════════════════════════════
# ADMIN PANEL — React + Vite + AntD (egasi/menejer)
# ═══════════════════════════════════

## 🏗️ PAPKA STRUKTURASI (Admin)

```
src/
├── api/{client.ts, endpoints/}     ← Axios + interceptors (token refresh)
├── components/{common, layout}/
├── pages/
│   ├── dashboard/                  ← KPI + savdo/foyda + jonli
│   ├── catalog/                    ← mahsulot/menyu boshqaruvi
│   ├── inventory/                  ← qoldiq, kirim, inventarizatsiya
│   ├── suppliers/                  ← yetkazib beruvchi + xarid
│   ├── sales/                      ← savdo tarixi, qaytarish
│   ├── tables/                     ← (restoran) zal sxemasi
│   ├── reports/                    ← savdo/foyda/ABC, eksport
│   ├── discounts/  ├── customers/
│   ├── shifts/                     ← smena hisobotlari (X/Z)
│   └── staff/                      ← hodim + rollar
├── hooks/                          ← React Query hooks
├── store/                          ← Zustand (minimal)
├── styles/theme.ts                 ← AntD theme tokens (tenant-themeable)
├── types/  └── utils/
```

## 🎨 STYLING (Admin)

```typescript
// ✅ Styled-components + AntD theme tokens | ❌ inline style, ❌ !important
const theme = { token: {
  colorPrimary: '#0EA5E9', colorSuccess: '#16A34A',
  colorError: '#EF4444',   colorWarning: '#F59E0B',
  borderRadius: 8, fontFamily: 'Outfit, sans-serif',
}};
// Rang biznesga moslanadi (white-label) — token orqali, hardcode YO'Q
```

## 🔄 REACT QUERY — BARCHA API calls shu pattern

```typescript
export const useProducts = (p: ProductsParams) =>
  useQuery({ queryKey: ['products', p], queryFn: () => catalogApi.getAll(p),
    staleTime: 5*60*1000 });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: catalogApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Mahsulot qo\u2019shildi'); },
    onError: (e: ApiError) => toast.error(e.message) });
};
// ❌ useEffect+fetch, ❌ manual loading/error state
```

## 📋 KOMPONENT QOIDALARI (Admin)

```
✅ Typed props | default export (pages) | named export (components/hooks/utils)
✅ Loading: Skeleton | Empty: Empty + description | Error: Result
✅ Memoization (memo, useCallback, useMemo) kerakli joyda
❌ any | props drilling 3+ (Context/Zustand) | import * from 'antd'
❌ moment.js (→dayjs) | alert() (→toast) | console.log (→logger)
```

## 🛠️ ADMIN ASOSIY EKRANLAR
```
- Dashboard: bugungi savdo/foyda, top mahsulot, kam qolgan tovar, jonli savdo
- Catalog: mahsulot/menyu, kategoriya, variant, modifikator, narx/tannarx, rasm
- Inventory: qoldiq (filial bo'yicha), kirim, inventarizatsiya, hisobdan chiqarish
- Suppliers: yetkazib beruvchi, xarid (kirim), qarz
- Sales: savdo tarixi, chek, qaytarish (vozvrat)
- Tables (restoran): zal sxemasi, stol tahrirlash
- Reports: savdo/foyda/ABC tahlil, smena (X/Z), eksport (xlsx)
- Discounts/Customers/Loyalty
- Shifts: smena tarixi, kassa farqi
- Staff: hodim, rol, PIN
```

## ⚡ PERFORMANCE (Admin)
```
✅ React.lazy()+Suspense har sahifa | bundle < 500KB gzip
✅ Virtualization: react-window (10000+ row — mahsulot/savdo/qoldiq)
```

---
---

# ═══════════════════════════════════
# POS / MOBILE — Flutter + Riverpod + GoRouter (kassa/ofitsiant/oshxona)
# ═══════════════════════════════════

> Bu — kassir, ofitsiant va oshxona ishlatadigan ilova (tablet/telefon).
> Tez, oflayn-bardosh, sodda bo'lishi shart.

## 🏗️ PAPKA STRUKTURASI (POS)

```
lib/
├── config/{theme.dart, router.dart, env.dart}
├── core/
│   ├── api/{dio_client.dart, api_endpoints.dart}
│   ├── error/{failures.dart, exceptions.dart}
│   ├── offline/{local_cache.dart, sync_queue.dart}   ← Hive + sync
│   └── utils/
├── features/
│   ├── pos/        ← savat, mahsulot grid, barkod, to'lov
│   ├── catalog/    ← menyu/mahsulot ko'rish
│   ├── tables/     ← (restoran) zal, stol tanlash
│   ├── kitchen/    ← (restoran) KDS — oshxona ekrani
│   ├── shift/      ← smena ochish/yopish
│   └── auth/       ← PIN kirish
│       └── presentation/{providers, screens, widgets}
├── shared/widgets/{app_scaffold.dart, product_tile.dart,
│                   cart_item.dart, table_card.dart, error_widget.dart}
└── main.dart
```

## 🎨 DIZAYN STANDARTLARI — AppTheme (tenant-themeable, lekin markazlashgan)

```dart
// ✅ FAQAT AppTheme.* ishlatilsin   // ❌ const Color(0xFF...) — TAQIQ
// Ranglar biznesga moslanadi (white-label), lekin default token:

AppTheme.primary        // #0EA5E9 — asosiy (biznes brendiga moslanadi)
AppTheme.accent         // #16A34A — yashil (tasdiq/to'lov)
AppTheme.textPrimary    // #1A1A2E
AppTheme.textSecondary  // #6B7280
AppTheme.bgBody         // #F8FAFC
AppTheme.cardBg         // #FFFFFF
AppTheme.cardBorder     // #E5E7EB
AppTheme.errorColor     // #EF4444
AppTheme.successColor   // #16A34A
AppTheme.warningColor   // #F59E0B

// Stol holati ranglari (restoran)
AppTheme.tableFree      // bo'sh
AppTheme.tableOccupied  // band
AppTheme.tableBill      // hisob kutmoqda

// Radius: small 8 | medium 12 | large 16 | xLarge 24
// Spacing: XS 4 | S 8 | M 16 | L 24 | XL 32
// Font: Outfit (theme orqali)
```

## 📱 SCREEN TEMPLATE — BARCHA ekranlar

```dart
import '../../config/theme.dart';
import '../../shared/widgets/app_scaffold.dart';

class XyzScreen extends ConsumerStatefulWidget {
  const XyzScreen({super.key});
  @override
  ConsumerState<XyzScreen> createState() => _XyzScreenState();
}

class _XyzScreenState extends ConsumerState<XyzScreen> {
  @override
  Widget build(BuildContext context) {
    final dataAsync = ref.watch(xyzProvider);
    return Scaffold(
      backgroundColor: AppTheme.bgBody,
      appBar: AppBar(title: const Text('Sarlavha')),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () => ref.refresh(xyzProvider.future),
        child: dataAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppTheme.primary)),
          error: (e, _) => Center(child: Column(
            mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, color: AppTheme.errorColor, size: 48),
              Text(e.toString()),
              ElevatedButton(
                onPressed: () => ref.refresh(xyzProvider.future),
                child: const Text('Qayta yuklash')),
            ])),
          data: (items) => items.isEmpty
            ? const Center(child: Column(
                mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.inbox_outlined, size: 48),
                  Text("Ma'lumot topilmadi")]))
            : GridView.builder(  // POS: mahsulot grid
                itemCount: items.length,
                itemBuilder: (_, i) => ProductTile(product: items[i]),
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 180, childAspectRatio: 0.85)),
        ),
      ),
    );
  }
}
```

## 🃏 KARTA STANDARTLARI (O'ZGARTIRILMAYDI)

```dart
// Umumiy karta dekoratsiyasi (ProductTile, CartItem, TableCard)
decoration: BoxDecoration(
  color: AppTheme.cardBg,
  borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
  border: Border.all(color: AppTheme.cardBorder, width: 1),
  boxShadow: [BoxShadow(
    color: const Color(0x05000000), blurRadius: 8, offset: const Offset(0, 2))],
),

// ProductTile (POS grid):  rasm + nom + narx + qoldiq badge (kam bo'lsa qizil)
// CartItem (savat):        nom + qty stepper (+/-) + narx + o'chirish
// TableCard (restoran):    stol raqami + holat rangi + summa + ofitsiant
// ❌ Gradient card backgroundda — TAQIQ (faqat to'lov yakuni/chek bannerда)
```

## 🔄 PROVIDER STANDARTLARI (Riverpod)

```dart
// ✅ AsyncValue pattern — MAJBURIY
@riverpod
Future<List<Product>> catalog(CatalogRef ref) async {
  final result = await ref.read(catalogRepositoryProvider).getProducts();
  return result.fold((failure) => throw failure, (products) => products);
}

// ✅ Mavjud providerlar — QAYTA YARATMA
// catalogProvider      — mahsulot/menyu
// cartProvider         — joriy savat (StateNotifier: add/remove/qty/modifier)
// salesProvider        — savdo tarixi
// tablesProvider       — (restoran) stollar (realtime)
// kitchenProvider      — (restoran) KDS buyurtmalar (realtime)
// shiftProvider        — joriy smena
// authStateProvider    — hodim (rol, branch)
// connectivityProvider — onlayn/oflayn holat
// scaffoldKeyProvider  — Drawer
```

## 🌐 REPOSITORY PATTERN

```dart
abstract class CatalogRepository {
  Future<Either<Failure, List<Product>>> getProducts();
}
abstract class SalesRepository {
  Future<Either<Failure, Sale>> createSale(CreateSaleDto dto); // idempotent
}

sealed class Failure { const Failure(this.message); final String message; }
class NetworkFailure extends Failure { const NetworkFailure(super.message); }
class ServerFailure  extends Failure { const ServerFailure(super.message); }
class CacheFailure   extends Failure { const CacheFailure(super.message); }
class AuthFailure    extends Failure { const AuthFailure(super.message); }
class StockFailure   extends Failure { const StockFailure(super.message); } // E4101
```

## 🧭 NAVIGATSIYA (O'ZGARTIRILMAYDI)

```dart
// Asosiy ekranlar
context.go('/pos');         // kassa (do'kon) / yangi buyurtma
context.go('/tables');      // (restoran) zal
context.go('/kitchen');     // (restoran) oshxona ekrani (KDS)
context.go('/shift');       // smena

// Stack
context.push('/cart');      // savat / hisob
context.push('/payment');   // to'lov
context.push('/sale/:id');  // chek tafsiloti

// ❌ Navigator.push — TAQIQ (GoRouter)
```

## 🔐 ROLE TEKSHIRISH — YAGONA STANDART

```dart
// ✅ FAQAT bu usul
final user = ref.read(authStateProvider).user;
if (user?.role.value == 'CASHIER') { ... }
if (user?.role.value == 'WAITER')  { ... }
if (user?.role.value == 'COOK')    { ... }   // oshxona — faqat KDS
// ❌ user.isCashier — TAQIQ | ❌ turlicha tekshirish — TAQIQ
```

## 🔌 OFFLINE SUPPORT (POS uchun KRITIK)

```
✅ Hive local cache — menyu/mahsulot, narx, joriy smena
✅ Savdo OFFLINE ham yakunlanadi → sync_queue ga yoziladi
✅ Onlayn bo'lganda → sync_queue serverga yuboriladi (idempotency-key bilan)
✅ Optimistic UI — savat, to'lov tugmasi
✅ connectivity_plus — onlayn/oflayn indikator

Cache TTL: menyu 30 min | qoldiq 1 min (onlayn bo'lsa) | smena — sessiya davomida
⚠️ Qoldiq oflayn taxminiy — onlayn bo'lganda server haqiqiy qoldiqni tasdiqlaydi
```

## 🍳 RESTORAN — KDS (oshxona ekrani) realtime

```
✅ WebSocket orqali yangi KOT darhol oshxona ekranida (< 1s)
✅ Taom holati: NEW → COOKING → READY → SERVED (oshpaz bosadi, ofitsiantga signal)
✅ Vaqt hisoblagich (har buyurtma qancha kutyapti) — kechiksa qizil
✅ Stol/ofitsiant ko'rinadi
```

## 🚫 FLUTTER TAQIQLAR — TO'LIQ RO'YXAT

```
❌ Color(0xFF...)             → AppTheme.*
❌ Kuchli shadows             → minimal yoki yo'q
❌ Card backgroundda gradient → faqat to'lov/chek banneri
❌ Mock data                  → real provider/API
❌ Navigator.push             → GoRouter
❌ setState provider o'rnida  → Riverpod
❌ print()                    → debugPrint()
❌ Inconsistent role check    → user?.role.value == 'X'
❌ Hardcoded string/narx      → constants.dart / theme / API
❌ Float bilan pul hisobi     → int (tiyin) yoki Decimal helper
```

---
---

# ═══════════════════════════════════
# QUEUES — BullMQ (Redis)
# ═══════════════════════════════════
```
print.queue      → chek / KOT / yorliq chop (printer gateway)
sync.queue       → oflayn POS savdolarini serverga sinxronlash
report.queue     → smena (Z) / kunlik / oylik hisobot generatsiya
notify.queue     → egasi/menejerga signal (kam qoldiq, katta chegirma, smena yopildi)
fiscal.queue     → fiskal chek yuborish (agar talab bo'lsa) + retry

✅ Har queue: retry (exp backoff) + DLQ + metrics + idempotency
```

---
---

# ═══════════════════════════════════
# INFRASTRUCTURE & DEVOPS
# ═══════════════════════════════════
```
✅ CI/CD:          automated testing & deployment (staging→prod)
✅ Multi-tenant:   organizationId/branchId hamma joyda, izolyatsiya test
✅ Analytics:      savdo/foyda metrics tracking
✅ i18n:           uz (asosiy) → ru ready
✅ Monitoring:     Winston + Sentry + health checks
✅ Backup:         savdo/qoldiq — kunlik backup + disaster recovery
✅ Code standards: ESLint, Prettier, Husky
✅ Docs:           Swagger, README per module, ADR
✅ Realtime:       WebSocket scale (Redis pub/sub) — KDS/stol
✅ Performance:    code splitting, lazy loading, memoization, offline POS
```

---

## 🧠 ARXITEKTOR SIFATIDA QO'SHIMCHA G'OYALAR
```
1. BITTA YADRO, IKKI REJIM — DOKON|RESTORAN feature-flag bilan (kod ulashiladi)
2. QOLDIQ HAR DOIM ATOMIK — savdo = transaction; negativ qoldiq mumkin emas (E4101)
3. TEXKARTA DEPLETION — restoran: taom sotilsa ingredient avto kamayadi (recipes)
4. SMENA (Z-hisobot) — kassa farqi, naqd/karta/Payme breakdown, audit
5. OFFLINE-FIRST POS — internet uzilsa ham savdo to'xtamaydi, keyin sync
6. KAM QOLDIQ SIGNALI — minimal chegaradan tushsa egasi/menejerga avto xabar
7. ABC / TOP TAHLIL — qaysi mahsulot/taom ko'p foyda, qaysi o'lik tovar
8. CHEGIRMA NAZORATI — katta chegirma → menejer tasdig'i + audit (firibgarlik)
9. MULTI-TENANT EKOTIZIM — markaziy paneldan barcha biznes/filial nazorati
10. WHITE-LABEL — har biznes o'z brendi/rangi (theme token), bitta kod bazasi
```

> Eslatma: tenant izolyatsiya, atomik qoldiq, oflayn-bardosh POS va audit —
> bular "qulaylik" emas, real do'kon/restoranда **ishonch va aniqlik** kafolati.

---

## ❓ ANIQLASHTIRISH KERAK (egasi to'ldiradi → CLAUDE.md yangilanadi)
```
1. Birinchi mijoz DOKON mi yoki RESTORAN mi? (MVP shunга qaratiladi)
2. Fiskal chek (soliq) talabi bormi? Qaysi modul/provayder?
3. To'lov: faqat naqd/karta yoki Payme/Click/Uzum ham?
4. Chek printeri qaysi (model/protokol)? KOT printeri alohida mi?
5. Barkod skaner / tarozi integratsiyasi kerakmi (do'kon)?
6. Bir biznesда nechta filial / kassa bo'ladi?
7. Markaziy ekotizim (XIZMAT-CRM) bilan bitta auth/akkaunt bo'lsinmi?
```