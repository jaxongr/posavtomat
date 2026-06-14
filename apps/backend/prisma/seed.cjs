// Plain CommonJS seed — runs with `node prisma/seed.cjs` (no ts-node needed).
// Enum values are passed as strings (Prisma accepts them). Idempotent (upsert).
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');

const prisma = new PrismaClient();

// Must match src/common/crypto/hash.util.ts format: <saltHex>:<hashHex>
function hashSecret(plain) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plain, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'a0000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: 'a0000000-0000-4000-8000-000000000001',
      name: 'Demo Do‘kon',
      businessType: 'DOKON',
      settings: { currency: 'UZS', theme: { primary: '#0EA5E9' } },
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: 'a0000000-0000-4000-8000-000000000010' },
    update: {},
    create: { id: 'a0000000-0000-4000-8000-000000000010', organizationId: org.id, name: 'Markaziy filial', address: 'Toshkent' },
  });

  await prisma.register.upsert({
    where: { id: 'a0000000-0000-4000-8000-000000000020' },
    update: {},
    create: { id: 'a0000000-0000-4000-8000-000000000020', organizationId: org.id, branchId: branch.id, name: 'Kassa 1' },
  });

  await prisma.staff.upsert({
    where: { id: 'a0000000-0000-4000-8000-000000000100' },
    update: {},
    create: {
      id: 'a0000000-0000-4000-8000-000000000100', organizationId: org.id,
      fish: 'Egasi Aliyev', phone: '+998901112233', role: 'OWNER', passwordHash: hashSecret('owner123'),
    },
  });
  await prisma.staff.upsert({
    where: { id: 'a0000000-0000-4000-8000-000000000101' },
    update: {},
    create: {
      id: 'a0000000-0000-4000-8000-000000000101', organizationId: org.id, branchId: branch.id,
      fish: 'Menejer Valiyev', phone: '+998901112244', role: 'MANAGER', passwordHash: hashSecret('manager123'),
    },
  });
  await prisma.staff.upsert({
    where: { id: 'a0000000-0000-4000-8000-000000000102' },
    update: {},
    create: {
      id: 'a0000000-0000-4000-8000-000000000102', organizationId: org.id, branchId: branch.id,
      fish: 'Kassir Karimov', phone: '+998901112255', role: 'CASHIER',
      passwordHash: hashSecret('kassir123'), pinHash: hashSecret('1234'),
    },
  });

  const category = await prisma.category.upsert({
    where: { id: 'a0000000-0000-4000-8000-000000000200' },
    update: {},
    create: { id: 'a0000000-0000-4000-8000-000000000200', organizationId: org.id, name: 'Ichimliklar' },
  });

  const products = [
    { id: 'a0000000-0000-4000-8000-000000000300', name: 'Coca-Cola 0.5L', barcode: '4780000000017', price: 12000, cost: 8000, qty: 100 },
    { id: 'a0000000-0000-4000-8000-000000000301', name: 'Suv Hayot 1L', barcode: '4780000000024', price: 5000, cost: 3000, qty: 200 },
    { id: 'a0000000-0000-4000-8000-000000000302', name: 'Non', barcode: '4780000000031', price: 3000, cost: 1800, qty: 50 },
    { id: 'a0000000-0000-4000-8000-000000000303', name: 'Choy Lipton', barcode: '4780000000048', price: 15000, cost: 10000, qty: 80 },
    { id: 'a0000000-0000-4000-8000-000000000304', name: 'Shokolad', barcode: '4780000000055', price: 8000, cost: 5000, qty: 120 },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, organizationId: org.id, categoryId: category.id, name: p.name, barcode: p.barcode, unit: 'DONA', type: 'GOODS', price: p.price, cost: p.cost },
    });
    await prisma.stock.upsert({
      where: { branchId_productId: { branchId: branch.id, productId: p.id } },
      update: {},
      create: { organizationId: org.id, branchId: branch.id, productId: p.id, quantity: p.qty, minQuantity: 10 },
    });
  }

  console.log('Seed complete: org=%s branch=%s', org.id, branch.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
