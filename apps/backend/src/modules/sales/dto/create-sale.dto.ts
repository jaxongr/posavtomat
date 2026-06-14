import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentProvider, SaleType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaleItemInputDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ example: 1, description: 'KG uchun kasr bo‘lishi mumkin' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  qty!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  modifierIds?: string[];
}

export class PaymentInputDto {
  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.CASH })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiProperty({ example: 24000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}

export class CreateSaleDto {
  @ApiProperty({
    description: 'Idempotency-key — bir savdo bir marta yoziladi (qayta yuborilsa eski qaytadi)',
    example: '7f1c0e8a-...',
  })
  @IsUUID()
  idempotencyKey!: string;

  @ApiProperty({ enum: SaleType, example: SaleType.POS })
  @IsEnum(SaleType)
  type!: SaleType;

  @ApiPropertyOptional({ description: 'Restoran: stol id' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Promokod (mavjud bo‘lsa chegirma qo‘llanadi)' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiProperty({ type: [SaleItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items!: SaleItemInputDto[];

  @ApiProperty({ type: [PaymentInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentInputDto)
  payments!: PaymentInputDto[];
}
