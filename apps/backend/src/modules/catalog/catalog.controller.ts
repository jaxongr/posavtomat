import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantContext } from '../../common/types/auth.types';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // Products
  @Get('products')
  @ApiOperation({ summary: 'Mahsulotlar ro‘yxati (cursor)' })
  findProducts(@Query() query: ProductQueryDto, @Tenant() ctx: TenantContext) {
    return this.catalog.findProducts(query, ctx);
  }

  @Get('products/:id')
  findProduct(@Param('id', ParseUUIDPipe) id: string, @Tenant() ctx: TenantContext) {
    return this.catalog.findProductById(id, ctx);
  }

  @Post('products')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCKKEEPER)
  @ApiOperation({ summary: 'Mahsulot yaratish' })
  createProduct(@Body() dto: CreateProductDto, @Tenant() ctx: TenantContext) {
    return this.catalog.createProduct(dto, ctx);
  }

  @Patch('products/:id')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCKKEEPER)
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Tenant() ctx: TenantContext,
  ) {
    return this.catalog.updateProduct(id, dto, ctx);
  }

  @Delete('products/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  removeProduct(@Param('id', ParseUUIDPipe) id: string, @Tenant() ctx: TenantContext) {
    return this.catalog.removeProduct(id, ctx);
  }

  // Categories
  @Get('categories')
  findCategories(@Tenant() ctx: TenantContext) {
    return this.catalog.findCategories(ctx);
  }

  @Post('categories')
  @Roles(Role.OWNER, Role.MANAGER)
  createCategory(@Body() dto: CreateCategoryDto, @Tenant() ctx: TenantContext) {
    return this.catalog.createCategory(dto, ctx);
  }

  @Patch('categories/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @Tenant() ctx: TenantContext,
  ) {
    return this.catalog.updateCategory(id, dto, ctx);
  }
}
