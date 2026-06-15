import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { BusinessType, Prisma, Role } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { hashSecret } from '../../common/crypto/hash.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Money } from '../../common/money/money';
import { subscriptionStatus } from '../../common/subscription';
import { AuthUser } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';

class CreateBusinessDto {
  @ApiProperty({ example: 'Yangi Do‘kon' })
  @IsString() @MinLength(2)
  name!: string;

  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType)
  businessType!: BusinessType;

  @ApiProperty({ example: 'Egasi F.I.Sh.' })
  @IsString() @MinLength(2)
  ownerFish!: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  ownerPhone!: string;

  @ApiProperty({ example: 'parol123' })
  @IsString() @MinLength(6)
  ownerPassword!: string;

  @ApiPropertyOptional({ example: 'Standart' })
  @IsOptional() @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: 300000, description: 'Oylik obuna narxi' })
  @IsOptional() @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 30, description: 'Obuna muddati (kun)' })
  @IsOptional() @IsInt() @Min(0)
  days?: number;
}

class SubscriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  plan?: string;

  @ApiPropertyOptional({ description: 'Oylik narx' }) @IsOptional() @IsNumber() @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Muddatni shu kunga uzaytirish (joriy tugashdan)' })
  @IsOptional() @IsInt() @Min(0)
  addDays?: number;
}

const DAY_MS = 86_400_000;

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(Role.SUPERADMIN)
@Controller('admin')
class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Post('organizations/:id/impersonate')
  @ApiOperation({ summary: 'Biznesga egasi sifatida kirish (super-admin)' })
  async impersonate(@Param('id', ParseUUIDPipe) id: string) {
    const owner = await this.prisma.staff.findFirst({
      where: { organizationId: id, role: Role.OWNER, active: true, deletedAt: null },
    });
    if (!owner) {
      throw new BusinessException('E2001', 'Bu biznesda egasi topilmadi');
    }
    return this.auth.tokensFor(owner);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Barcha bizneslar + obuna + savdo statistikasi' })
  async list() {
    const orgs = await this.prisma.organization.findMany({
      where: { deletedAt: null },
      select: {
        id: true, name: true, businessType: true, active: true,
        plan: true, subscriptionPrice: true, subscriptionEndsAt: true, createdAt: true,
        _count: { select: { branches: true, staff: true, sales: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const ids = orgs.map((o) => o.id);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [allTime, today, last] = await Promise.all([
      this.prisma.sale.groupBy({ by: ['organizationId'], where: { organizationId: { in: ids }, status: 'COMPLETED' }, _sum: { total: true } }),
      this.prisma.sale.groupBy({ by: ['organizationId'], where: { organizationId: { in: ids }, status: 'COMPLETED', completedAt: { gte: startOfDay } }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.sale.groupBy({ by: ['organizationId'], where: { organizationId: { in: ids } }, _max: { createdAt: true } }),
    ]);
    const allMap = new Map(allTime.map((r) => [r.organizationId, Money.of(r._sum.total ?? 0).toString()]));
    const todayMap = new Map(today.map((r) => [r.organizationId, { total: Money.of(r._sum.total ?? 0).toString(), count: r._count._all }]));
    const lastMap = new Map(last.map((r) => [r.organizationId, r._max.createdAt?.toISOString() ?? null]));

    return orgs.map((o) => ({
      ...o,
      subscription: subscriptionStatus(o.subscriptionEndsAt),
      revenueTotal: allMap.get(o.id) ?? '0',
      todaySales: todayMap.get(o.id)?.total ?? '0',
      todayCount: todayMap.get(o.id)?.count ?? 0,
      lastActivity: lastMap.get(o.id) ?? null,
    }));
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Biznes tafsiloti — filiallar, hodimlar, statistika' })
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      select: {
        id: true, name: true, businessType: true, active: true,
        plan: true, subscriptionPrice: true, subscriptionEndsAt: true, createdAt: true, settings: true,
      },
    });
    if (!org) {
      throw new BusinessException('E2001', 'Biznes topilmadi');
    }
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [branches, staff, productCount, agg, todayAgg] = await Promise.all([
      this.prisma.branch.findMany({ where: { organizationId: id, deletedAt: null }, select: { id: true, name: true, address: true, active: true } }),
      this.prisma.staff.findMany({ where: { organizationId: id, deletedAt: null }, select: { id: true, fish: true, role: true, phone: true, branchId: true, active: true }, orderBy: { fish: 'asc' } }),
      this.prisma.product.count({ where: { organizationId: id, deletedAt: null } }),
      this.prisma.sale.aggregate({ where: { organizationId: id, status: 'COMPLETED' }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.sale.aggregate({ where: { organizationId: id, status: 'COMPLETED', completedAt: { gte: startOfDay } }, _sum: { total: true }, _count: { _all: true } }),
    ]);
    return {
      org: { ...org, subscription: subscriptionStatus(org.subscriptionEndsAt) },
      branches,
      staff,
      stats: {
        productCount,
        revenueTotal: Money.of(agg._sum.total ?? 0).toString(),
        salesCount: agg._count._all,
        todaySales: Money.of(todayAgg._sum.total ?? 0).toString(),
        todayCount: todayAgg._count._all,
      },
    };
  }

  @Post('organizations')
  @ApiOperation({ summary: 'Yangi biznes yaratish (tashkilot + egasi + filial)' })
  async create(@Body() dto: CreateBusinessDto) {
    const exists = await this.prisma.staff.findFirst({ where: { phone: dto.ownerPhone, deletedAt: null }, select: { id: true } });
    if (exists) {
      throw new BusinessException('E2002', 'Bu telefon raqami band');
    }
    const endsAt = dto.days ? new Date(Date.now() + dto.days * DAY_MS) : null;
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          businessType: dto.businessType,
          plan: dto.plan ?? 'Standart',
          subscriptionPrice: Money.of(dto.price ?? 0).toPrisma(),
          subscriptionEndsAt: endsAt,
        },
      });
      const branch = await tx.branch.create({ data: { organizationId: org.id, name: 'Asosiy filial' } });
      await tx.register.create({ data: { organizationId: org.id, branchId: branch.id, name: 'Kassa 1' } });
      await tx.staff.create({
        data: {
          organizationId: org.id,
          fish: dto.ownerFish,
          phone: dto.ownerPhone,
          role: Role.OWNER,
          passwordHash: await hashSecret(dto.ownerPassword),
        },
      });
      return { ...org, subscription: subscriptionStatus(endsAt) };
    });
  }

  @Patch('organizations/:id/subscription')
  @ApiOperation({ summary: 'Obunani belgilash/uzaytirish (narx + muddat)' })
  async setSubscription(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SubscriptionDto) {
    const org = await this.prisma.organization.findUnique({ where: { id }, select: { subscriptionEndsAt: true } });
    if (!org) {
      throw new BusinessException('E2001', 'Biznes topilmadi');
    }
    const base = org.subscriptionEndsAt && org.subscriptionEndsAt.getTime() > Date.now() ? org.subscriptionEndsAt.getTime() : Date.now();
    const endsAt = dto.addDays ? new Date(base + dto.addDays * DAY_MS) : org.subscriptionEndsAt;
    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.plan ? { plan: dto.plan } : {}),
        ...(dto.price !== undefined ? { subscriptionPrice: Money.of(dto.price).toPrisma() } : {}),
        ...(dto.addDays ? { subscriptionEndsAt: endsAt } : {}),
      } as Prisma.OrganizationUpdateInput,
      select: { id: true, name: true, plan: true, subscriptionPrice: true, subscriptionEndsAt: true },
    });
    return { ...updated, subscription: subscriptionStatus(updated.subscriptionEndsAt) };
  }

  @Patch('organizations/:id/toggle')
  @ApiOperation({ summary: 'Biznesni faollashtirish/o‘chirish' })
  async toggle(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() _admin: AuthUser) {
    const org = await this.prisma.organization.findUnique({ where: { id }, select: { active: true } });
    if (!org) {
      throw new BusinessException('E2001', 'Biznes topilmadi');
    }
    return this.prisma.organization.update({
      where: { id },
      data: { active: !org.active },
      select: { id: true, active: true },
    });
  }
}

@Module({ imports: [AuthModule], controllers: [AdminController] })
export class AdminModule {}
