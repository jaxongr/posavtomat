import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class StockQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Faqat kam qolganlar' })
  @IsOptional()
  @IsString()
  lowOnly?: string;
}

export class AdjustStockDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 42.5, description: 'Sanab chiqilgan haqiqiy qoldiq' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  countedQty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class WasteStockDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2, description: 'Hisobdan chiqariladigan miqdor' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  qty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SetMinQtyDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 10 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  minQuantity!: number;
}
