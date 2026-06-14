import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Staff } from '@prisma/client';
import { verifySecret } from '../../common/crypto/hash.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { JwtPayload } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, PinLoginDto } from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; fish: string; role: string; organizationId: string; branchId: string | null };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    const staff = await this.prisma.staff.findFirst({
      where: { phone: dto.login, active: true, deletedAt: null },
    });
    if (!staff?.passwordHash || !(await verifySecret(dto.password, staff.passwordHash))) {
      throw new BusinessException('E1001', 'Login yoki parol noto‘g‘ri');
    }
    return this.issueTokens(staff);
  }

  async pinLogin(dto: PinLoginDto): Promise<AuthTokens> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, active: true, deletedAt: null },
    });
    if (!staff?.pinHash || !(await verifySecret(dto.pin, staff.pinHash))) {
      throw new BusinessException('E1001', 'PIN-kod noto‘g‘ri');
    }
    return this.issueTokens(staff);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new BusinessException('E1003', 'Refresh token yaroqsiz');
    }
    if (payload.type !== 'refresh') {
      throw new BusinessException('E1003');
    }
    const staff = await this.prisma.staff.findFirst({
      where: { id: payload.sub, active: true, deletedAt: null },
    });
    if (!staff) {
      throw new BusinessException('E1001');
    }
    return this.issueTokens(staff);
  }

  private async issueTokens(staff: Staff): Promise<AuthTokens> {
    const base = {
      sub: staff.id,
      role: staff.role,
      organizationId: staff.organizationId,
      branchId: staff.branchId,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, type: 'access' } satisfies JwtPayload,
        {
          secret: this.config.get<string>('jwt.accessSecret'),
          expiresIn: this.config.get<string>('jwt.accessTtl'),
        },
      ),
      this.jwt.signAsync(
        { ...base, type: 'refresh' } satisfies JwtPayload,
        {
          secret: this.config.get<string>('jwt.refreshSecret'),
          expiresIn: this.config.get<string>('jwt.refreshTtl'),
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      user: {
        id: staff.id,
        fish: staff.fish,
        role: staff.role,
        organizationId: staff.organizationId,
        branchId: staff.branchId,
      },
    };
  }
}
