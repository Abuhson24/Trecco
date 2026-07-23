import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(memberId: string) {
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    return {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      address: member.address,
      imageUrl: member.imageUrl,
      preferredLanguage: member.preferredLanguage,
      hasTransactionPin: !!member.transactionPinHash,
      hasPanicPassword: !!member.panicPasswordHash,
    };
  }

  // Name + address only — email/phone stay locked since they're the login
  // identifier and Xpress Wallet KYC record respectively; changing either
  // would desync from the real bank account already provisioned against them.
  async updateProfile(memberId: string, input: { fullName?: string; address?: string }) {
    return this.prisma.member.update({
      where: { id: memberId },
      data: {
        fullName: input.fullName?.trim() || undefined,
        address: input.address?.trim() || undefined,
      },
    });
  }

  async updateProfileImage(memberId: string, imageUrl: string) {
    return this.prisma.member.update({ where: { id: memberId }, data: { imageUrl } });
  }

  async updateLanguage(memberId: string, preferredLanguage: string) {
    const valid = ['ENGLISH', 'HAUSA', 'YORUBA', 'IGBO', 'PIDGIN', 'KISWAHILI', 'FRENCH', 'PORTUGUESE', 'AMHARIC', 'ARABIC'];
    if (!valid.includes(preferredLanguage)) {
      throw new BadRequestException(`preferredLanguage must be one of: ${valid.join(', ')}`);
    }
    return this.prisma.member.update({
      where: { id: memberId },
      data: { preferredLanguage: preferredLanguage as any },
    });
  }

  async changePassword(memberId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    const valid = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.member.update({ where: { id: memberId }, data: { passwordHash } });
    return { updated: true };
  }

  // Sets or changes the transaction PIN. Requires the account password (not
  // the PIN itself) to authorize the change — same as changing a card PIN
  // requiring your online banking password, not the old card PIN, in case
  // the PIN itself was what got compromised.
  async setTransactionPin(memberId: string, password: string, newPin: string) {
    if (!/^\d{4,6}$/.test(newPin)) {
      throw new BadRequestException('Transaction PIN must be 4-6 digits');
    }
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Password is incorrect');

    const transactionPinHash = await bcrypt.hash(newPin, 10);
    await this.prisma.member.update({ where: { id: memberId }, data: { transactionPinHash } });
    return { updated: true };
  }

  async verifyTransactionPin(memberId: string, pin: string | undefined): Promise<boolean> {
    if (!pin) return false;
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    if (!member.transactionPinHash) return false;
    return bcrypt.compare(pin, member.transactionPinHash);
  }

  // Sets or changes the panic password. Requires the REAL account password
  // to authorize (never the panic password itself), and must not equal the
  // real password — otherwise entering the real password would always also
  // "trigger" panic mode, defeating the whole point.
  async setPanicPassword(memberId: string, password: string, newPanicPassword: string) {
    if (!newPanicPassword || newPanicPassword.length < 8) {
      throw new BadRequestException('Panic password must be at least 8 characters');
    }
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Password is incorrect');

    const sameAsReal = await bcrypt.compare(newPanicPassword, member.passwordHash);
    if (sameAsReal) {
      throw new BadRequestException('Panic password must be different from your real password');
    }

    const panicPasswordHash = await bcrypt.hash(newPanicPassword, 10);
    await this.prisma.member.update({ where: { id: memberId }, data: { panicPasswordHash } });
    return { updated: true };
  }

  async removePanicPassword(memberId: string, password: string) {
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Password is incorrect');

    await this.prisma.member.update({ where: { id: memberId }, data: { panicPasswordHash: null } });
    return { updated: true };
  }

  // Soft delete. Requires password confirmation — this is irreversible from
  // the member's own side (only an admin/support action could undo it), so
  // treat it like changing a password: prove you are who you say you are.
  // Doesn't touch cooperativeId/role or any history — just marks the
  // account inactive and blocks future logins (see AuthService.login).
  async deleteAccount(memberId: string, password: string) {
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    if (member.deletedAt) {
      throw new ForbiddenException('Account is already deleted');
    }
    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) throw new UnauthorizedException('Password is incorrect');

    await this.prisma.member.update({ where: { id: memberId }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }
}
