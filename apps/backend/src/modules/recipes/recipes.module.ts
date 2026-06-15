import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Quantity } from '../../common/money/quantity';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

class RecipeItemDto {
  @ApiProperty()
  @IsUUID()
  ingredientId!: string;

  @ApiProperty({ example: 0.25, description: '1 porsiya uchun ingredient miqdori' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  qty!: number;
}

class SetRecipeDto {
  @ApiProperty({ type: [RecipeItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items!: RecipeItemDto[];
}

@ApiTags('recipes')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('recipes')
class RecipesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':dishProductId')
  @ApiOperation({ summary: 'Taom texkartasi' })
  async get(@Param('dishProductId', ParseUUIDPipe) dishProductId: string, @Tenant() ctx: TenantContext) {
    await this.assertProduct(dishProductId, ctx);
    return this.prisma.recipe.findUnique({
      where: { dishProductId },
      include: { items: { include: { ingredient: { select: { id: true, name: true, unit: true, cost: true } } } } },
    });
  }

  @Put(':dishProductId')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Texkartani o‘rnatish (to‘liq almashtiradi)' })
  async set(
    @Param('dishProductId', ParseUUIDPipe) dishProductId: string,
    @Body() dto: SetRecipeDto,
    @Tenant() ctx: TenantContext,
  ) {
    await this.assertProduct(dishProductId, ctx);
    // Validate ingredients belong to the tenant.
    const ids = dto.items.map((i) => i.ingredientId);
    const found = await this.prisma.product.count({
      where: { id: { in: ids }, organizationId: ctx.orgId, deletedAt: null },
    });
    if (found !== new Set(ids).size) {
      throw new BusinessException('E4102', 'Ba‘zi ingredientlar topilmadi');
    }

    return this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.upsert({
        where: { dishProductId },
        create: { dishProductId },
        update: {},
      });
      await tx.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
      await tx.recipeItem.createMany({
        data: dto.items.map((i) => ({
          recipeId: recipe.id,
          ingredientId: i.ingredientId,
          qty: Quantity.of(i.qty).toPrisma(),
        })),
      });
      return tx.recipe.findUnique({ where: { id: recipe.id }, include: { items: true } });
    });
  }

  private async assertProduct(id: string, ctx: TenantContext): Promise<void> {
    const p = await this.prisma.product.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!p) {
      throw new BusinessException('E2001', 'Mahsulot topilmadi');
    }
  }
}

@Module({ controllers: [RecipesController] })
export class RecipesModule {}
