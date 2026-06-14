/**
 * Sale engine integration test — requires a live Postgres (CI service container).
 * Proves the critical guarantees: atomicity, idempotency, no negative stock,
 * shift requirement, recipe depletion, refund restores stock.
 *
 * Run: pnpm test:integration  (after prisma migrate deploy)
 */
import { PrismaClient, ProductType, SaleType, ShiftStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuthUser, TenantContext } from '../src/common/types/auth.types';
import { PrismaService } from '../src/prisma/prisma.service';
import { StockManager } from '../src/modules/inventory/stock.manager';
import { ShiftsService } from '../src/modules/shifts/shifts.service';
import { SalesService } from '../src/modules/sales/sales.service';
import { CreateSaleDto } from '../src/modules/sales/dto/create-sale.dto';

const redisStub = {
  get: async () => null,
  setex: async () => undefined,
  del: async () => undefined,
  delPattern: async () => undefined,
} as unknown as import('../src/redis/redis.service').RedisService;

describe('SalesService (integration)', () => {
  const prisma = new PrismaService();
  const stock = new StockManager();
  const shifts = new ShiftsService(prisma);
  const sales = new SalesService(prisma, stock, shifts, redisStub);

  let ctx: TenantContext;
  let user: AuthUser;
  let productId: string;
  let dishId: string;
  let ingredientId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const org = await prisma.organization.create({
      data: { name: 'IT-Org', businessType: 'DOKON' },
    });
    const branch = await prisma.branch.create({
      data: { organizationId: org.id, name: 'IT-Branch' },
    });
    const staff = await prisma.staff.create({
      data: { organizationId: org.id, branchId: branch.id, fish: 'Tester', role: 'CASHIER' },
    });
    ctx = { orgId: org.id, branchId: branch.id };
    user = { id: staff.id, fish: 'Tester', role: 'CASHIER', organizationId: org.id, branchId: branch.id };

    // Goods product with stock 10.
    const product = await prisma.product.create({
      data: {
        organizationId: org.id,
        name: 'Cola',
        unit: 'DONA',
        type: ProductType.GOODS,
        price: 12000,
        cost: 8000,
      },
    });
    productId = product.id;
    await prisma.stock.create({
      data: { organizationId: org.id, branchId: branch.id, productId, quantity: 10 },
    });

    // Dish + ingredient (recipe depletion).
    const ingredient = await prisma.product.create({
      data: { organizationId: org.id, name: 'Go‘sht', unit: 'KG', type: ProductType.INGREDIENT, price: 0, cost: 50000 },
    });
    ingredientId = ingredient.id;
    await prisma.stock.create({
      data: { organizationId: org.id, branchId: branch.id, productId: ingredientId, quantity: 5 },
    });
    const dish = await prisma.product.create({
      data: { organizationId: org.id, name: 'Kabob', unit: 'PORSIYA', type: ProductType.DISH, price: 40000, cost: 0, trackStock: false },
    });
    dishId = dish.id;
    await prisma.recipe.create({
      data: { dishProductId: dish.id, items: { create: [{ ingredientId, qty: 0.25 }] } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function saleDto(over: Partial<CreateSaleDto> = {}): CreateSaleDto {
    return {
      idempotencyKey: randomUUID(),
      type: SaleType.POS,
      items: [{ productId, qty: 2 }],
      payments: [{ provider: 'CASH', amount: 24000 }],
      ...over,
    };
  }

  it('rejects a sale when no shift is open (E4301)', async () => {
    await expect(sales.create(saleDto(), user, ctx)).rejects.toMatchObject({ code: 'E4301' });
  });

  it('completes a sale atomically and deducts stock', async () => {
    await shifts.open({ openCash: 0 }, user, ctx);
    const sale = await sales.create(saleDto(), user, ctx);
    expect(sale.status).toBe('COMPLETED');
    const s = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
    });
    expect(Number(s.quantity)).toBe(8); // 10 - 2
  });

  it('is idempotent — same key returns the same sale, stock unchanged', async () => {
    const dto = saleDto();
    const first = await sales.create(dto, user, ctx);
    const second = await sales.create(dto, user, ctx);
    expect(second.id).toBe(first.id);
    const s = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
    });
    expect(Number(s.quantity)).toBe(6); // only one deduction of 2 from 8
  });

  it('rolls back the whole sale when stock is insufficient (E4101)', async () => {
    const before = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
    });
    const dto = saleDto({
      items: [{ productId, qty: 9999 }],
      payments: [{ provider: 'CASH', amount: 119988000 }],
    });
    await expect(sales.create(dto, user, ctx)).rejects.toMatchObject({ code: 'E4101' });
    const after = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
    });
    expect(Number(after.quantity)).toBe(Number(before.quantity)); // unchanged
    // No orphan sale row persisted.
    const orphan = await prisma.sale.findUnique({
      where: { organizationId_idempotencyKey: { organizationId: ctx.orgId, idempotencyKey: dto.idempotencyKey } },
    });
    expect(orphan).toBeNull();
  });

  it('deducts ingredients via recipe when a dish is sold', async () => {
    const dto = saleDto({
      items: [{ productId: dishId, qty: 4 }],
      payments: [{ provider: 'CARD', amount: 160000 }],
    });
    await sales.create(dto, user, ctx);
    const ing = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: ctx.branchId, productId: ingredientId } },
    });
    expect(Number(ing.quantity)).toBe(4); // 5 - (0.25 * 4)
  });

  it('refund restores stock and is idempotent', async () => {
    const dto = saleDto({
      items: [{ productId, qty: 1 }],
      payments: [{ provider: 'CASH', amount: 12000 }],
    });
    const sale = await sales.create(dto, user, ctx);
    const afterSale = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
    });
    await sales.refund(sale.id, user, ctx);
    const afterRefund = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
    });
    expect(Number(afterRefund.quantity)).toBe(Number(afterSale.quantity) + 1);
    // Idempotent: refunding again does not double-restore.
    await sales.refund(sale.id, user, ctx);
    const afterSecond = await prisma.stock.findUniqueOrThrow({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
    });
    expect(Number(afterSecond.quantity)).toBe(Number(afterRefund.quantity));
  });

  it('updates shift totals (Z-report figures)', async () => {
    const shift = await prisma.shift.findFirstOrThrow({
      where: { staffId: user.id, status: ShiftStatus.OPEN },
    });
    expect(Number(shift.totalSales)).toBeGreaterThan(0);
    expect(Number(shift.cashSales)).toBeGreaterThan(0);
    expect(Number(shift.cardSales)).toBeGreaterThan(0);
  });
});
