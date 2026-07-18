import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TermiiClient } from './termii.client';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';


interface SignupInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
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
  cooperativeId: string | null;
}

export function toPublicMember(member: {
  id: string; fullName: string; email: string; phone: string; address: string | null; role: string; cooperativeId: string | null;
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
    private readonly termii: TermiiClient,
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
    if (!input.email || !input.phone || !input.password || !input.fullName) {
      throw new BadRequestException('fullName, email, phone, and password are all required');
    }
    if (input.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }


    const existing = await this.prisma.member.findFirst({
      where: { OR: [{ email: input.email }, { phone: input.phone }] },
    });
    if (existing) throw new ConflictException('A member with that email or phone already exists');

    const passwordHash = await bcrypt.hash(input.password, 10);

    const member = await this.prisma.member.create({
      data: {
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

  async verifyAccessToken(token: string): Promise<{ sub: string; role: string; cooperativeId: string | null }> {
    return this.accessTokens.verifyAsync(token);
  }

  // Public wrapper so other services (e.g. CooperativeService, after a join
  // or create action changes a member's cooperativeId/role) can reissue a
  // fresh token pair without duplicating the signing logic here.
  async issueTokensFor(member: { id: string; role: string; cooperativeId: string | null }): Promise<TokenPair> {
    return this.issueTokens(member);
  }

  // Deliberately returns the same generic message whether or not the phone
  // number exists in the system -- confirming/denying that a phone number
  // is registered is itself sensitive information (phone enumeration).
  async forgotPassword(phone: string): Promise<{ message: string }> {
    const member = await this.prisma.member.findUnique({ where: { phone } });

    if (member) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.prisma.member.update({
        where: { id: member.id },
        data: { passwordResetCode: code, passwordResetExpiresAt: expiresAt },
      });

      await this.termii.sendSms(
        phone,
        `Your Trecco password reset code is ${code}. It expires in 10 minutes. Do not share this code.`,
      );
    } else {
      this.logger.log(`Password reset requested for unregistered phone ${phone} -- no SMS sent`);
    }

    return { message: 'If that phone number is registered, a reset code has been sent via SMS.' };
  }

  async resetPassword(phone: string, code: string, newPassword: string): Promise<{ message: string }> {
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const member = await this.prisma.member.findUnique({ where: { phone } });
    if (
      !member ||
      !member.passwordResetCode ||
      !member.passwordResetExpiresAt ||
      member.passwordResetCode !== code ||
      member.passwordResetExpiresAt < new Date()
    ) {
      // Same error for "no such phone", "wrong code", and "expired code" --
      // distinguishing them would help an attacker narrow down valid phone
      // numbers or brute-force the code with feedback on each guess.
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.member.update({
      where: { id: member.id },
      data: { passwordHash, passwordResetCode: null, passwordResetExpiresAt: null },
    });

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  private async issueTokens(member: { id: string; role: string; cooperativeId: string | null }): Promise<TokenPair> {
    const payload = { sub: member.id, role: member.role, cooperativeId: member.cooperativeId };
    return {
      accessToken: await this.accessTokens.signAsync(payload),
      refreshToken: await this.refreshTokens.signAsync(payload),
    };
  }
}
