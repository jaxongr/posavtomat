import { Injectable } from '@nestjs/common';
import { Prisma, ProductType } from '@prisma/client';
import { buildPage } from '../../common/dto/pagination.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Money } from '../../common/money/money';
import { Quantity } from '../../common/money/quantity';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { StockManager } from '../inventory/stock.manager';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

const CATALOG_TTL = 600;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly stock: StockManager,
  ) {}

  // ───────────────────────── Products ─────────────────────────
  async findProducts(query: ProductQueryDto, ctx: TenantContext) {
    const cacheKey = `catalog:${ctx.orgId}:${ctx.branchId}:products:${JSON.stringify(query)}`;
    const cached = await this.redis.get<ReturnType<typeof buildPage>>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.ProductWhereInput = {
      organizationId: ctx.orgId,
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.barcode ? { barcode: query.barcode } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const rows = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        cost: true,
        barcode: true,
        sku: true,
        unit: true,
        type: true,
        active: true,
        imageUrl: true,
        categoryId: true,
        stocks: {
          where: { branchId: ctx.branchId },
          select: { quantity: true, minQuantity: true },
        },
      },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { name: 'asc' },
    });

    const page = buildPage(rows, query.limit);
    await this.redis.setex(cacheKey, CATALOG_TTL, page);
    return page;
  }

  async findProductById(id: string, ctx: TenantContext) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      include: {
        variants: { where: { deletedAt: null } },
        stocks: { where: { branchId: ctx.branchId } },
      },
    });
    if (!product) {
      throw new BusinessException('E2001', 'Mahsulot topilmadi');
    }
    return product;
  }

  async createProduct(dto: CreateProductDto, ctx: TenantContext) {
    await this.assertUniqueBarcode(dto.barcode, ctx.orgId);
    const trackStock = dto.trackStock ?? true;
    // Dishes don't hold stock (ingredients are depleted via recipe), so an
    // initial quantity only makes sense for stock-tracked goods/ingredients.
    const initialStock =
      dto.type !== ProductType.DISH && trackStock && dto.initialStock && dto.initialStock > 0
        ? Quantity.of(dto.initialStock)
        : null;

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          organizationId: ctx.orgId,
          categoryId: dto.categoryId,
          name: dto.name,
          sku: dto.sku,
          barcode: dto.barcode,
          unit: dto.unit,
          type: dto.type,
          price: Money.of(dto.price).toPrisma(),
          cost: Money.of(dto.cost ?? 0).toPrisma(),
          imageUrl: dto.imageUrl,
          trackStock,
        },
      });
      if (initialStock) {
        await this.stock.increase(
          tx,
          {
            organizationId: ctx.orgId,
            branchId: ctx.branchId,
            productId: created.id,
            qty: initialStock,
            refType: 'INITIAL',
            refId: created.id,
            note: 'Boshlang‘ich qoldiq',
          },
          'IN',
        );
      }
      return created;
    });

    await this.invalidate(ctx);
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto, ctx: TenantContext) {
    await this.findProductById(id, ctx);
    if (dto.barcode) {
      await this.assertUniqueBarcode(dto.barcode, ctx.orgId, id);
    }
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
        ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.price !== undefined ? { price: Money.of(dto.price).toPrisma() } : {}),
        ...(dto.cost !== undefined ? { cost: Money.of(dto.cost).toPrisma() } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.trackStock !== undefined ? { trackStock: dto.trackStock } : {}),
      },
    });
    await this.invalidate(ctx);
    return product;
  }

  async removeProduct(id: string, ctx: TenantContext) {
    await this.findProductById(id, ctx);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    await this.invalidate(ctx);
    return { id };
  }

  // ───────────────────────── Categories ─────────────────────────
  async findCategories(ctx: TenantContext) {
    return this.prisma.category.findMany({
      where: { organizationId: ctx.orgId, deletedAt: null },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(dto: CreateCategoryDto, ctx: TenantContext) {
    const category = await this.prisma.category.create({
      data: {
        organizationId: ctx.orgId,
        name: dto.name,
        parentId: dto.parentId,
        sort: dto.sort ?? 0,
      },
    });
    await this.invalidate(ctx);
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, ctx: TenantContext) {
    const existing = await this.prisma.category.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
    });
    if (!existing) {
      throw new BusinessException('E2001', 'Kategoriya topilmadi');
    }
    const category = await this.prisma.category.update({ where: { id }, data: dto });
    await this.invalidate(ctx);
    return category;
  }

  // ───────────────────────── Helpers ─────────────────────────
  private async assertUniqueBarcode(
    barcode: string | undefined,
    orgId: string,
    excludeId?: string,
  ): Promise<void> {
    if (!barcode) {
      return;
    }
    const found = await this.prisma.product.findFirst({
      where: {
        organizationId: orgId,
        barcode,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (found) {
      throw new BusinessException('E2002', 'Bu barkod allaqachon mavjud');
    }
  }

  private async invalidate(ctx: TenantContext): Promise<void> {
    await this.redis.delPattern(`catalog:${ctx.orgId}:${ctx.branchId}:*`);
  }
}
