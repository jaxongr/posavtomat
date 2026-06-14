import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class OpenShiftDto {
  @ApiPropertyOptional({ description: 'Kassa (register) id' })
  @IsOptional()
  @IsUUID()
  registerId?: string;

  @ApiProperty({ example: 100000, description: 'Boshlang‘ich kassa puli' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openCash!: number;
}

export class CloseShiftDto {
  @ApiProperty({ example: 850000, description: 'Yopilishda sanab olingan naqd' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closeCash!: number;
}
