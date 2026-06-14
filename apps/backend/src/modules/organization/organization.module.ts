import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('organization')
@ApiBearerAuth()
@Controller()
class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

  // Branch list is needed for OWNER/MANAGER to choose a tenant branch
  // (x-branch-id). Scoped to the user's organization — no TenantGuard here
  // because branch is not yet selected.
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
  @ApiOperation({ summary: 'Tashkilot ma‘lumoti (sozlama/tur)' })
  organization(@CurrentUser() user: AuthUser) {
    return this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, name: true, businessType: true, settings: true },
    });
  }
}

@Module({ controllers: [OrganizationController] })
export class OrganizationModule {}
