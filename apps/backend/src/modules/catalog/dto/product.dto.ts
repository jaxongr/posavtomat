import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductType, Unit } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'Coca-Cola 0.5L' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ enum: Unit, default: Unit.DONA })
  @IsEnum(Unit)
  unit: Unit = Unit.DONA;

  @ApiProperty({ enum: ProductType, default: ProductType.GOODS })
  @IsEnum(ProductType)
  type: ProductType = ProductType.GOODS;

  @ApiProperty({ example: 12000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 8000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'Boshlang‘ich qoldiq (joriy filialga)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  initialStock?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Barcode bo‘yicha qidirish (tez savdo)' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
