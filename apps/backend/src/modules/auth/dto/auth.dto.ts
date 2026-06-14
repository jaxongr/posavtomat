import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  login!: string; // phone yoki username

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class PinLoginDto {
  @ApiProperty({ example: 'a1b2c3...', description: 'Staff id' })
  @IsUUID()
  staffId!: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 6)
  pin!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
