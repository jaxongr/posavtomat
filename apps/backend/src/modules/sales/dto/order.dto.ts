import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { PaymentInputDto, SaleItemInputDto } from './create-sale.dto';

/** Open a dine-in/takeaway order (no payment yet). */
export class OpenOrderDto {
  @ApiProperty()
  @IsUUID()
  tableId!: string;

  @ApiProperty({ type: [SaleItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items!: SaleItemInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCode?: string;
}

/** Append items to an open order (new KOT to the kitchen). */
export class AddItemsDto {
  @ApiProperty({ type: [SaleItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items!: SaleItemInputDto[];
}

/** Close the bill — take payment(s) and complete the order. */
export class PayOrderDto {
  @ApiProperty({ type: [PaymentInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentInputDto)
  payments!: PaymentInputDto[];
}
