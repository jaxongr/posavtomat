import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Money } from '../../common/money/money';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

class CreateCustomerDto {
  @ApiProperty({ example: 'Akmal Karimov' })
  @IsString()
  @MinLength(1)
  fish!: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

class AddPointsDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  points!: number;
}

class RepayDto {
  @ApiProperty({ example: 50000, description: 'Qaytarilayotgan qarz summasi' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('customers')
class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Mijozlar (qidiruv: ?search=)' })
  findAll(@Tenant() ctx: TenantContext, @Query('search') search?: string) {
    return this.prisma.customer.findMany({
      where: {
        organizationId: ctx.orgId,
        deletedAt: null,
        ...(search ? { OR: [{ fish: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } : {}),
      },
      orderBy: { fish: 'asc' },
      take: 100,
    });
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.SELLER, Role.WAITER)
  @ApiOperation({ summary: 'Mijoz qo‘shish' })
  create(@Body() dto: CreateCustomerDto, @Tenant() ctx: TenantContext) {
    return this.prisma.customer.create({
      data: { organizationId: ctx.orgId, fish: dto.fish, phone: dto.phone, note: dto.note },
    });
  }

  @Patch(':id/points')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Sodiqlik ballini qo‘shish/ayirish' })
  async addPoints(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddPointsDto, @Tenant() ctx: TenantContext) {
    const found = await this.prisma.customer.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new BusinessException('E2001', 'Mijoz topilmadi');
    }
    return this.prisma.customer.update({
      where: { id },
      data: { loyaltyPoints: { increment: dto.points } },
    });
  }

  @Patch(':id/repay')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.SELLER, Role.WAITER)
  @ApiOperation({ summary: 'Qarz (nasiya) to‘lash — qarzni kamaytirish' })
  async repay(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RepayDto, @Tenant() ctx: TenantContext) {
    const c = await this.prisma.customer.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true, debt: true },
    });
    if (!c) {
      throw new BusinessException('E2001', 'Mijoz topilmadi');
    }
    // Don't let debt go below zero.
    const newDebt = Money.of(c.debt).subtract(dto.amount);
    return this.prisma.customer.update({
      where: { id },
      data: { debt: (newDebt.isNegative() ? Money.zero() : newDebt).toPrisma() },
    });
  }
}

@Module({ controllers: [CustomersController] })
export class CustomersModule {}
