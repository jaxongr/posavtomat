// Plain CommonJS seed — `node prisma/seed.cjs` (no ts-node). Idempotent (upsert).
// Rich demo data for both a shop (DOKON) and a restaurant (RESTORAN).
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');

const prisma = new PrismaClient();

function hashSecret(plain) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(plain, salt, 64).toString('hex')}`;
}

// Stable UUID helper: a0000000-0000-4000-8000-<12 hex>
const uid = (n) => `a0000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

async function ensureOrg(id, name, businessType, primary) {
  return prisma.organization.upsert({
    where: { id }, update: {},
    create: { id, name, businessType, settings: { currency: 'UZS', theme: { primary } } },
  });
}
async function ensureBranch(id, organizationId, name) {
  return prisma.branch.upsert({ where: { id }, update: {}, create: { id, organizationId, name, address: 'Toshkent' } });
}
async function ensureRegister(id, organizationId, branchId, name) {
  return prisma.register.upsert({ where: { id }, update: {}, create: { id, organizationId, branchId, name } });
}
async function ensureStaff(id, organizationId, branchId, fish, role, phone, password, pin) {
  return prisma.staff.upsert({
    where: { id }, update: {},
    create: { id, organizationId, branchId, fish, role, phone, passwordHash: hashSecret(password), pinHash: pin ? hashSecret(pin) : null },
  });
}
async function ensureCategory(id, organizationId, name) {
  return prisma.category.upsert({ where: { id }, update: {}, create: { id, organizationId, name } });
}
async function ensureProduct(id, organizationId, categoryId, name, opts) {
  return prisma.product.upsert({
    where: { id }, update: {},
    create: {
      id, organizationId, categoryId, name,
      barcode: opts.barcode ?? null, unit: opts.unit ?? 'DONA', type: opts.type ?? 'GOODS',
      price: opts.price ?? 0, cost: opts.cost ?? 0, trackStock: opts.trackStock ?? true,
    },
  });
}
async function ensureStock(organizationId, branchId, productId, quantity, minQuantity) {
  return prisma.stock.upsert({
    where: { branchId_productId: { branchId, productId } }, update: {},
    create: { organizationId, branchId, productId, quantity, minQuantity },
  });
}
async function ensureRecipe(dishProductId, items) {
  const recipe = await prisma.recipe.upsert({ where: { dishProductId }, update: {}, create: { dishProductId } });
  for (const it of items) {
    const exists = await prisma.recipeItem.findFirst({ where: { recipeId: recipe.id, ingredientId: it.ingredientId } });
    if (!exists) await prisma.recipeItem.create({ data: { recipeId: recipe.id, ingredientId: it.ingredientId, qty: it.qty } });
  }
}

async function main() {
  // ═══════════════════ PLATFORMA (super-admin) ═══════════════════
  const platform = await ensureOrg(uid(900), 'SAVDO-POS Platform', 'DOKON', '#111827');
  await ensureStaff(uid(910), platform.id, null, 'Super Admin', 'SUPERADMIN', '+998900000000', 'superadmin123', null);

  // ═══════════════════ DOKON ═══════════════════
  const org = await ensureOrg(uid(1), 'Demo Do‘kon', 'DOKON', '#0EA5E9');
  const branch = await ensureBranch(uid(10), org.id, 'Markaziy filial');
  await ensureRegister(uid(20), org.id, branch.id, 'Kassa 1');
  await ensureStaff(uid(100), org.id, null, 'Egasi Aliyev', 'OWNER', '+998901112233', 'owner123', null);
  await ensureStaff(uid(101), org.id, branch.id, 'Menejer Valiyev', 'MANAGER', '+998901112244', 'manager123', null);
  await ensureStaff(uid(102), org.id, branch.id, 'Kassir Karimov', 'CASHIER', '+998901112255', 'kassir123', '1234');
  await ensureStaff(uid(103), org.id, branch.id, 'Sotuvchi Tursunov', 'SELLER', '+998901112266', 'sotuvchi123', '3333');
  await ensureStaff(uid(104), org.id, branch.id, 'Omborchi Saidov', 'STOCKKEEPER', '+998901112277', 'ombor123', null);

  const dCats = {
    ich: await ensureCategory(uid(200), org.id, 'Ichimliklar'),
    non: await ensureCategory(uid(201), org.id, 'Non va shirinliklar'),
    sut: await ensureCategory(uid(202), org.id, 'Sut mahsulotlari'),
    bak: await ensureCategory(uid(203), org.id, 'Bakaleya'),
    kim: await ensureCategory(uid(204), org.id, 'Maishiy kimyo'),
  };
  const dProducts = [
    [300, dCats.ich, 'Coca-Cola 0.5L', '4780000000017', 12000, 8000, 100, 15],
    [301, dCats.ich, 'Suv Hayot 1L', '4780000000024', 5000, 3000, 200, 30],
    [302, dCats.ich, 'Fanta 1L', '4780000000031', 13000, 9000, 60, 10],
    [303, dCats.ich, 'Choy Lipton', '4780000000048', 15000, 10000, 80, 10],
    [304, dCats.ich, 'Coffee 3in1', '4780000000055', 3000, 1800, 8, 20],
    [305, dCats.non, 'Non', '4780000000062', 3000, 1800, 50, 20],
    [306, dCats.non, 'Tort bo‘lagi', '4780000000079', 18000, 11000, 12, 5],
    [307, dCats.non, 'Pechenye', '4780000000086', 9000, 6000, 40, 10],
    [308, dCats.non, 'Shokolad', '4780000000093', 8000, 5000, 120, 20],
    [309, dCats.sut, 'Sut 1L', '4780000000109', 11000, 8000, 45, 15],
    [310, dCats.sut, 'Qatiq 0.5L', '4780000000116', 7000, 4500, 30, 10],
    [311, dCats.sut, 'Pishloq 200g', '4780000000123', 25000, 18000, 6, 8],
    [312, dCats.sut, 'Sariyog‘ 200g', '4780000000130', 22000, 16000, 18, 6],
    [313, dCats.bak, 'Guruch 1kg', '4780000000147', 16000, 12000, 70, 15],
    [314, dCats.bak, 'Makaron 400g', '4780000000154', 8000, 5500, 90, 20],
    [315, dCats.bak, 'Yog‘ 1L', '4780000000161', 24000, 19000, 25, 8],
    [316, dCats.bak, 'Tuz 1kg', '4780000000178', 3000, 1500, 110, 20],
    [317, dCats.kim, 'Sovun', '4780000000185', 6000, 3500, 5, 12],
    [318, dCats.kim, 'Shampun', '4780000000192', 28000, 20000, 22, 6],
    [319, dCats.kim, 'Tish pastasi', '4780000000208', 17000, 11000, 33, 8],
  ];
  for (const [n, cat, name, barcode, price, cost, qty, min] of dProducts) {
    await ensureProduct(uid(n), org.id, cat.id, name, { barcode, price, cost, unit: 'DONA' });
    await ensureStock(org.id, branch.id, uid(n), qty, min);
  }

  // ═══════════════════ RESTORAN ═══════════════════
  const resto = await ensureOrg(uid(401), 'Demo Restoran', 'RESTORAN', '#E11D48');
  const rbranch = await ensureBranch(uid(402), resto.id, 'Restoran filiali');
  await ensureRegister(uid(403), resto.id, rbranch.id, 'Kassa 1');
  await ensureStaff(uid(410), resto.id, null, 'Restoran egasi', 'OWNER', '+998901113344', 'owner123', null);
  await ensureStaff(uid(411), resto.id, rbranch.id, 'Ofitsiant Salimov', 'WAITER', '+998901113355', 'ofitsiant123', '1111');
  await ensureStaff(uid(412), resto.id, rbranch.id, 'Oshpaz Yusupov', 'COOK', '+998901113366', 'oshpaz123', '2222');
  await ensureStaff(uid(413), resto.id, rbranch.id, 'Restoran kassiri', 'CASHIER', '+998901113377', 'kassir123', '4444');

  const rCats = {
    issiq: await ensureCategory(uid(420), resto.id, 'Issiq taomlar'),
    salat: await ensureCategory(uid(421), resto.id, 'Salatlar'),
    ich: await ensureCategory(uid(422), resto.id, 'Ichimliklar'),
    shirin: await ensureCategory(uid(423), resto.id, 'Shirinliklar'),
  };

  // Ingredients (xom ashyo) — stocked, KG
  const ingredients = [
    [600, 'Go‘sht', 80000, 50, 5],
    [601, 'Guruch', 14000, 80, 10],
    [602, 'Kartoshka', 5000, 100, 15],
    [603, 'Sabzi', 6000, 60, 10],
    [604, 'Piyoz', 5000, 70, 10],
    [605, 'Pomidor', 12000, 40, 8],
    [606, 'Bodring', 10000, 35, 8],
    [607, 'Un', 7000, 90, 15],
    [608, 'Tovuq', 45000, 40, 6],
    [609, 'Yog‘', 22000, 30, 5],
  ];
  const ingId = {};
  for (const [n, name, cost, qty, min] of ingredients) {
    await ensureProduct(uid(n), resto.id, null, name, { unit: 'KG', type: 'INGREDIENT', price: 0, cost });
    await ensureStock(resto.id, rbranch.id, uid(n), qty, min);
    ingId[name] = uid(n);
  }

  // Dishes (menyu) — type DISH (no stock), with recipes
  const dishes = [
    [700, rCats.issiq, 'Osh (palov)', 35000, [['Guruch', 0.2], ['Go‘sht', 0.15], ['Sabzi', 0.1], ['Piyoz', 0.05], ['Yog‘', 0.03]]],
    [701, rCats.issiq, 'Kabob (1 six)', 28000, [['Go‘sht', 0.2], ['Piyoz', 0.03]]],
    [702, rCats.issiq, 'Lag‘mon', 32000, [['Un', 0.15], ['Go‘sht', 0.1], ['Sabzi', 0.05], ['Pomidor', 0.05]]],
    [703, rCats.issiq, 'Tovuq shashlik', 30000, [['Tovuq', 0.25], ['Piyoz', 0.03]]],
    [704, rCats.issiq, 'Kartoshka fri', 18000, [['Kartoshka', 0.25], ['Yog‘', 0.05]]],
    [705, rCats.salat, 'Achchiq-chuchuk', 12000, [['Pomidor', 0.1], ['Bodring', 0.1], ['Piyoz', 0.03]]],
    [706, rCats.salat, 'Sezar salat', 25000, [['Tovuq', 0.1], ['Pomidor', 0.05]]],
  ];
  for (const [n, cat, name, price, recipe] of dishes) {
    await ensureProduct(uid(n), resto.id, cat.id, name, { unit: 'PORSIYA', type: 'DISH', price, cost: 0, trackStock: false });
    await ensureRecipe(uid(n), recipe.map(([ing, qty]) => ({ ingredientId: ingId[ing], qty })));
  }
  // Drinks/desserts — GOODS with stock (no recipe)
  const rGoods = [
    [720, rCats.ich, 'Choy (choynak)', 8000, 2000, 200, 20],
    [721, rCats.ich, 'Coca-Cola 0.5L', 12000, 8000, 80, 15],
    [722, rCats.ich, 'Ayron', 7000, 4000, 50, 10],
    [723, rCats.shirin, 'Muzqaymoq', 15000, 9000, 40, 8],
    [724, rCats.shirin, 'Tort bo‘lagi', 20000, 12000, 25, 5],
  ];
  for (const [n, cat, name, price, cost, qty, min] of rGoods) {
    await ensureProduct(uid(n), resto.id, cat.id, name, { unit: 'DONA', type: 'GOODS', price, cost });
    await ensureStock(resto.id, rbranch.id, uid(n), qty, min);
  }

  // Tables
  for (let i = 1; i <= 8; i++) {
    await prisma.diningTable.upsert({
      where: { id: uid(450 + i) }, update: {},
      create: { id: uid(450 + i), organizationId: resto.id, branchId: rbranch.id, name: `Stol ${i}`, zone: i <= 5 ? 'Zal' : 'Terassa', seats: i <= 5 ? 4 : 6 },
    });
  }

  // Customers + discounts (both orgs)
  await prisma.customer.upsert({ where: { id: uid(800) }, update: {}, create: { id: uid(800), organizationId: org.id, fish: 'Doimiy mijoz Akmal', phone: '+998935550001', loyaltyPoints: 120 } });
  await prisma.customer.upsert({ where: { id: uid(801) }, update: {}, create: { id: uid(801), organizationId: org.id, fish: 'Mijoz Dilnoza', phone: '+998935550002', loyaltyPoints: 45 } });
  await prisma.customer.upsert({ where: { id: uid(802) }, update: {}, create: { id: uid(802), organizationId: resto.id, fish: 'Mehmon Bobur', phone: '+998935550003', loyaltyPoints: 80 } });
  await prisma.supplier.upsert({ where: { id: uid(820) }, update: {}, create: { id: uid(820), organizationId: org.id, name: 'OOO Optom Savdo', phone: '+998712001122' } });
  await prisma.supplier.upsert({ where: { id: uid(821) }, update: {}, create: { id: uid(821), organizationId: org.id, name: 'Mega Distribyutor', phone: '+998712003344' } });
  await prisma.supplier.upsert({ where: { id: uid(822) }, update: {}, create: { id: uid(822), organizationId: resto.id, name: 'Go‘sht bazasi', phone: '+998712005566' } });
  await prisma.supplier.upsert({ where: { id: uid(823) }, update: {}, create: { id: uid(823), organizationId: resto.id, name: 'Sabzavot bozori', phone: '+998712007788' } });
  await prisma.discount.upsert({ where: { id: uid(810) }, update: {}, create: { id: uid(810), organizationId: org.id, name: 'Tushlik chegirma 10%', type: 'PERCENT', value: 10, promoCode: 'TUSHLIK', conditions: { minTotal: 50000 } } });
  await prisma.discount.upsert({ where: { id: uid(811) }, update: {}, create: { id: uid(811), organizationId: resto.id, name: 'Mehmon -5000', type: 'FIXED', value: 5000, promoCode: 'XUSH', conditions: {} } });

  console.log('Seed complete: DOKON=%s (%d mahsulot) | RESTORAN=%s (menyu+texkarta)', org.id, dProducts.length, resto.id);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
