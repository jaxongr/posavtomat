import { Body, Controller, Get, Module, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { subscriptionStatus } from '../../common/subscription';
import { AuthUser } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

class CreateBranchDto {
  @ApiProperty({ example: '2-filial' })
  @IsString() @MaxLength(60)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  address?: string;
}

class ReceiptSettingsDto {
  @ApiPropertyOptional({ example: 'Mening Do‘konim' })
  @IsOptional() @IsString() @MaxLength(60)
  shopName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  address?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ description: 'Pastki matn (chek oxiri)' })
  @IsOptional() @IsString() @MaxLength(120)
  footer?: string;

  @ApiPropertyOptional({ enum: ['58', '80'], description: 'Qog‘oz eni mm' })
  @IsOptional() @IsIn(['58', '80'])
  width?: '58' | '80';

  @ApiPropertyOptional({ description: 'Kassir ismini ko‘rsatish' })
  @IsOptional() @IsBoolean()
  showCashier?: boolean;
}

class UpdateOrgDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60)
  name?: string;

  @ApiProperty({ type: ReceiptSettingsDto })
  @IsOptional()
  receipt?: ReceiptSettingsDto;
}

@ApiTags('organization')
@ApiBearerAuth()
@Controller()
class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('branches')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tashkilot filiallari' })
  branches(@CurrentUser() user: AuthUser) {
    return this.prisma.branch.findMany({
      where: { organizationId: user.organizationId, deletedAt: null, active: true },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('organization')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tashkilot ma‘lumoti + obuna holati' })
  async organization(@CurrentUser() user: AuthUser) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: {
        id: true, name: true, businessType: true, settings: true,
        plan: true, subscriptionPrice: true, subscriptionEndsAt: true,
      },
    });
    return { ...org, subscription: subscriptionStatus(org.subscriptionEndsAt) };
  }

  @Post('branches')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Yangi filial qo‘shish (avtomatik kassa bilan)' })
  async createBranch(@Body() dto: CreateBranchDto, @CurrentUser() user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: { organizationId: user.organizationId, name: dto.name, address: dto.address },
        select: { id: true, name: true, address: true },
      });
      // Every branch gets its own register so a shift can be opened immediately.
      await tx.register.create({
        data: { organizationId: user.organizationId, branchId: branch.id, name: 'Kassa 1' },
      });
      return branch;
    });
  }

  @Patch('organization')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tashkilot/chek sozlamalarini yangilash' })
  async update(@Body() dto: UpdateOrgDto, @CurrentUser() user: AuthUser) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
    const current = (org.settings ?? {}) as Record<string, unknown>;
    const currentReceipt = (current.receipt ?? {}) as Record<string, unknown>;
    const settings = {
      ...current,
      ...(dto.receipt ? { receipt: { ...currentReceipt, ...dto.receipt } } : {}),
    } as Prisma.InputJsonValue;
    return this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { ...(dto.name ? { name: dto.name } : {}), settings },
      select: { id: true, name: true, businessType: true, settings: true },
    });
  }
}

@Module({ controllers: [OrganizationController] })
export class OrganizationModule {}
