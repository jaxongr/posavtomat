import { BusinessType, PrismaClient, ProductType, Role, Unit } from '@prisma/client';
import { hashSecret } from '../src/common/crypto/hash.util';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Idempotent seed — safe to run repeatedly.
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Do‘kon',
      businessType: BusinessType.DOKON,
      settings: { currency: 'UZS', theme: { primary: '#0EA5E9' } },
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      organizationId: org.id,
      name: 'Markaziy filial',
      address: 'Toshkent',
    },
  });

  await prisma.register.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      organizationId: org.id,
      branchId: branch.id,
      name: 'Kassa 1',
    },
  });

  const [ownerPass, managerPass, cashierPin] = await Promise.all([
    hashSecret('owner123'),
    hashSecret('manager123'),
    hashSecret('1234'),
  ]);

  await prisma.staff.upsert({
    where: { id: '00000000-0000-0000-0000-000000000100' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000100',
      organizationId: org.id,
      fish: 'Egasi Aliyev',
      phone: '+998901112233',
      role: Role.OWNER,
      passwordHash: ownerPass,
    },
  });

  await prisma.staff.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      organizationId: org.id,
      branchId: branch.id,
      fish: 'Menejer Valiyev',
      phone: '+998901112244',
      role: Role.MANAGER,
      passwordHash: managerPass,
    },
  });

  await prisma.staff.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      organizationId: org.id,
      branchId: branch.id,
      fish: 'Kassir Karimov',
      phone: '+998901112255',
      role: Role.CASHIER,
      pinHash: cashierPin,
    },
  });

  const category = await prisma.category.upsert({
    where: { id: '00000000-0000-0000-0000-000000000200' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000200',
      organizationId: org.id,
      name: 'Ichimliklar',
    },
  });

  const demoProducts = [
    { id: '00000000-0000-0000-0000-000000000300', name: 'Coca-Cola 0.5L', barcode: '4780000000017', price: 12000, cost: 8000, qty: 100 },
    { id: '00000000-0000-0000-0000-000000000301', name: 'Suv Hayot 1L', barcode: '4780000000024', price: 5000, cost: 3000, qty: 200 },
    { id: '00000000-0000-0000-0000-000000000302', name: 'Non', barcode: '4780000000031', price: 3000, cost: 1800, qty: 50 },
  ];

  for (const p of demoProducts) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        organizationId: org.id,
        categoryId: category.id,
        name: p.name,
        barcode: p.barcode,
        unit: Unit.DONA,
        type: ProductType.GOODS,
        price: p.price,
        cost: p.cost,
      },
    });
    await prisma.stock.upsert({
      where: { branchId_productId: { branchId: branch.id, productId: p.id } },
      update: {},
      create: {
        organizationId: org.id,
        branchId: branch.id,
        productId: p.id,
        quantity: p.qty,
        minQuantity: 10,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete: org=%s branch=%s', org.id, branch.id);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
