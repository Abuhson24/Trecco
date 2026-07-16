import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

interface SignupInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  cooperativeId: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface PublicMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string | null;
  role: string;
  cooperativeId: string;
}

function toPublicMember(member: {
  id: string; fullName: string; email: string; phone: string; address: string | null; role: string; cooperativeId: string;
}): PublicMember {
  return {
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    address: member.address,
    role: member.role,
    cooperativeId: member.cooperativeId,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokens: JwtService;
  private readonly refreshTokens: JwtService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set — see .env.example');
    }
    this.accessTokens = new JwtService({ secret: accessSecret, signOptions: { expiresIn: ACCESS_TOKEN_TTL } });
    this.refreshTokens = new JwtService({ secret: refreshSecret, signOptions: { expiresIn: REFRESH_TOKEN_TTL } });
  }

  async signup(input: SignupInput): Promise<TokenPair & { member: PublicMember }> {
    if (!input.email || !input.phone || !input.password || !input.fullName || !input.cooperativeId) {
      throw new BadRequestException('fullName, email, phone, password, and cooperativeId are all required');
    }
    if (input.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const cooperative = await this.prisma.cooperative.findUnique({ where: { id: input.cooperativeId } });
    if (!cooperative) {
      throw new BadRequestException('Unknown cooperativeId — the member must be joining an existing cooperative');
    }

    const existing = await this.prisma.member.findFirst({
      where: { OR: [{ email: input.email }, { phone: input.phone }] },
    });
    if (existing) throw new ConflictException('A member with that email or phone already exists');

    const passwordHash = await bcrypt.hash(input.password, 10);

    const member = await this.prisma.member.create({
      data: {
        cooperativeId: input.cooperativeId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        passwordHash,
      },
    });

    try {
      await this.wallet.provisionAccount(member.id);
    } catch (err) {
      this.logger.warn(`provisionAccount not available yet for member ${member.id}: ${(err as Error).message}`);
    }

    return { ...(await this.issueTokens(member)), member: toPublicMember(member) };
  }

  async login(input: LoginInput): Promise<TokenPair & { member: PublicMember }> {
    const member = await this.prisma.member.findUnique({ where: { email: input.email } });
    if (!member) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(input.password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    return { ...(await this.issueTokens(member)), member: toPublicMember(member) };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = await this.refreshTokens.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const member = await this.prisma.member.findUnique({ where: { id: payload.sub } });
    if (!member) throw new UnauthorizedException('Member no longer exists');

    return this.issueTokens(member);
  }

  async me(memberId: string): Promise<PublicMember> {
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    return toPublicMember(member);
  }

  async verifyAccessToken(token: string): Promise<{ sub: string; role: string; cooperativeId: string }> {
    return this.accessTokens.verifyAsync(token);
  }

  private async issueTokens(member: { id: string; role: string; cooperativeId: string }): Promise<TokenPair> {
    const payload = { sub: member.id, role: member.role, cooperativeId: member.cooperativeId };
    return {
      accessToken: await this.accessTokens.signAsync(payload),
      refreshToken: await this.refreshTokens.signAsync(payload),
    };
  }
}
