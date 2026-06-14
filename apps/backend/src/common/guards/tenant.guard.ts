import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../exceptions/business.exception';
import { AuthUser, TenantContext } from '../types/auth.types';

/**
 * Resolves the tenant scope (orgId + branchId) for every request and attaches
 * it as request.tenant. Branch is taken from the staff's own branch, or — for
 * OWNER/MANAGER without a fixed branch — from the `x-branch-id` header, which
 * must belong to the same organization.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser; tenant?: TenantContext }>();
    const user = request.user;
    if (!user) {
      throw new BusinessException('E1001');
    }

    const headerBranch = request.headers['x-branch-id'];
    const branchId = user.branchId ?? (typeof headerBranch === 'string' ? headerBranch : null);

    if (!branchId) {
      throw new BusinessException('E3001', 'branchId aniqlanmadi (x-branch-id sarlavhasi kerak)');
    }

    // Verify branch belongs to the user's organization (tenant isolation).
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) {
      throw new BusinessException('E1002', 'Filial ushbu tashkilotga tegishli emas');
    }

    request.tenant = { orgId: user.organizationId, branchId };
    return true;
  }
}
