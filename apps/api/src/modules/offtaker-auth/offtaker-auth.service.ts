import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

interface SignupInput {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  password: string;
}

interface LoginInput {
  contactEmail: string;
  password: string;
}

function toPublicOfftaker(o: { id: string; companyName: string; contactEmail: string; contactPhone: string; verified: boolean }) {
  return { id: o.id, companyName: o.companyName, contactEmail: o.contactEmail, contactPhone: o.contactPhone, verified: o.verified };
}

// Deliberately separate from AuthService — offtakers are a different
// identity type (no cooperative, no Role enum, no committee voting). Sharing
// a token issuer with Member auth would make it too easy for a bug to let an
// offtaker token pass as a member token or vice versa. Kept structurally
// similar to AuthService on purpose, so it's easy to read side by side.
@Injectable()
export class OfftakerAuthService {
  private readonly tokens: JwtService;

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET must be set — see .env.example');
    // Separate token "type" claim (see issueToken) means even though this
    // reuses the same secret as member tokens, JwtAuthGuard for members
    // and this guard are not interchangeable — each checks its own `type`.
    this.tokens = new JwtService({ secret, signOptions: { expiresIn: '7d' } });
  }

  async signup(input: SignupInput) {
    if (!input.companyName || !input.contactEmail || !input.contactPhone || !input.password) {
      throw new BadRequestException('companyName, contactEmail, contactPhone, and password are all required');
    }
    if (input.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const existing = await this.prisma.offtaker.findUnique({ where: { contactEmail: input.contactEmail } });
    if (existing) throw new ConflictException('An offtaker with that email already exists');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const offtaker = await this.prisma.offtaker.create({
      data: {
        companyName: input.companyName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        passwordHash,
        // verified defaults to false — a Trecco admin should confirm this
        // is a real buyer before they can post demands. Enforce that check
        // in MarketplaceService.createDemand once this lands, not here.
      },
    });

    return { accessToken: this.issueToken(offtaker.id), offtaker: toPublicOfftaker(offtaker) };
  }

  async login(input: LoginInput) {
    const offtaker = await this.prisma.offtaker.findUnique({ where: { contactEmail: input.contactEmail } });
    if (!offtaker) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(input.password, offtaker.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    return { accessToken: this.issueToken(offtaker.id), offtaker: toPublicOfftaker(offtaker) };
  }

  async verifyToken(token: string): Promise<{ sub: string }> {
    const payload = await this.tokens.verifyAsync<{ sub: string; type: string }>(token);
    if (payload.type !== 'offtaker') throw new UnauthorizedException('Not an offtaker token');
    return payload;
  }

  private issueToken(offtakerId: string): string {
    return this.tokens.sign({ sub: offtakerId, type: 'offtaker' });
  }
}
