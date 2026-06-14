import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Karimov Akmal' })
  @IsString()
  @MinLength(2)
  fish!: string;

  @ApiPropertyOptional({ example: '+998901112233' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ description: 'Filial (kassir/ofitsiant uchun)' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Panel paroli (OWNER/MANAGER/STOCKKEEPER)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: 'Kassir PIN-kodi (4-6 raqam)' })
  @IsOptional()
  @IsString()
  @Length(4, 6)
  pin?: string;
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
