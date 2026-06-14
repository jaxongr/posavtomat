import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashSecret } from '../../common/crypto/hash.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

const SAFE_SELECT = {
  id: true,
  fish: true,
  phone: true,
  role: true,
  branchId: true,
  active: true,
  createdAt: true,
} satisfies Prisma.StaffSelect;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(ctx: TenantContext) {
    return this.prisma.staff.findMany({
      where: { organizationId: ctx.orgId, deletedAt: null },
      select: SAFE_SELECT,
      orderBy: { fish: 'asc' },
    });
  }

  async create(dto: CreateStaffInput, ctx: TenantContext) {
    const pinHash = dto.pin ? await hashSecret(dto.pin) : null;
    const passwordHash = dto.password ? await hashSecret(dto.password) : null;
    if (!pinHash && !passwordHash) {
      throw new BusinessException('E3001', 'PIN yoki parol kerak');
    }
    return this.prisma.staff.create({
      data: {
        organizationId: ctx.orgId,
        branchId: dto.branchId ?? null,
        fish: dto.fish,
        phone: dto.phone,
        role: dto.role,
        pinHash,
        passwordHash,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateStaffInput, ctx: TenantContext) {
    await this.assertExists(id, ctx);
    const data: Prisma.StaffUpdateInput = {
      ...(dto.fish !== undefined ? { fish: dto.fish } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.branchId !== undefined ? { branch: dto.branchId ? { connect: { id: dto.branchId } } : { disconnect: true } } : {}),
      ...(dto.pin ? { pinHash: await hashSecret(dto.pin) } : {}),
      ...(dto.password ? { passwordHash: await hashSecret(dto.password) } : {}),
    };
    return this.prisma.staff.update({ where: { id }, data, select: SAFE_SELECT });
  }

  async deactivate(id: string, ctx: TenantContext) {
    await this.assertExists(id, ctx);
    await this.prisma.staff.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
    return { id };
  }

  private async assertExists(id: string, ctx: TenantContext): Promise<void> {
    const found = await this.prisma.staff.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new BusinessException('E2001', 'Hodim topilmadi');
    }
  }
}

export interface CreateStaffInput {
  fish: string;
  phone?: string;
  role: Prisma.StaffCreateInput['role'];
  branchId?: string;
  password?: string;
  pin?: string;
}
export type UpdateStaffInput = Partial<CreateStaffInput>;
