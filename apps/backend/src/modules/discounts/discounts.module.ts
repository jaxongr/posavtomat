import { Body, Controller, Delete, Get, Module, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { DiscountType, Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Money } from '../../common/money/money';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

class CreateDiscountDto {
  @ApiProperty({ example: 'Yangi yil aksiyasi' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  type!: DiscountType;

  @ApiProperty({ example: 10, description: 'PERCENT: 0-100 | FIXED: summa' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Minimal chek summasi' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minTotal?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@ApiTags('discounts')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('discounts')
class DiscountsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Chegirmalar ro‘yxati' })
  findAll(@Tenant() ctx: TenantContext) {
    return this.prisma.discount.findMany({
      where: { organizationId: ctx.orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Chegirma yaratish' })
  create(@Body() dto: CreateDiscountDto, @Tenant() ctx: TenantContext) {
    return this.prisma.discount.create({
      data: {
        organizationId: ctx.orgId,
        name: dto.name,
        type: dto.type,
        value: Money.of(dto.value).toPrisma(),
        promoCode: dto.promoCode,
        conditions: dto.minTotal ? { minTotal: dto.minTotal } : {},
        active: dto.active ?? true,
      },
    });
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDiscountDto, @Tenant() ctx: TenantContext) {
    await this.assert(id, ctx);
    return this.prisma.discount.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        value: Money.of(dto.value).toPrisma(),
        promoCode: dto.promoCode,
        conditions: dto.minTotal ? { minTotal: dto.minTotal } : {},
        active: dto.active ?? true,
      },
    });
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() ctx: TenantContext) {
    await this.assert(id, ctx);
    await this.prisma.discount.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    return { id };
  }

  private async assert(id: string, ctx: TenantContext): Promise<void> {
    const found = await this.prisma.discount.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new BusinessException('E2001', 'Chegirma topilmadi');
    }
  }
}

@Module({ controllers: [DiscountsController] })
export class DiscountsModule {}
