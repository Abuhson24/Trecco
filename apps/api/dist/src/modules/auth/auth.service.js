"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
function toPublicMember(member) {
    return {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        cooperativeId: member.cooperativeId,
    };
}
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, wallet) {
        this.prisma = prisma;
        this.wallet = wallet;
        this.logger = new common_1.Logger(AuthService_1.name);
        const accessSecret = process.env.JWT_ACCESS_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!accessSecret || !refreshSecret) {
            throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set — see .env.example');
        }
        this.accessTokens = new jwt_1.JwtService({ secret: accessSecret, signOptions: { expiresIn: ACCESS_TOKEN_TTL } });
        this.refreshTokens = new jwt_1.JwtService({ secret: refreshSecret, signOptions: { expiresIn: REFRESH_TOKEN_TTL } });
    }
    async signup(input) {
        if (!input.email || !input.phone || !input.password || !input.fullName || !input.cooperativeId) {
            throw new common_1.BadRequestException('fullName, email, phone, password, and cooperativeId are all required');
        }
        if (input.password.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        const cooperative = await this.prisma.cooperative.findUnique({ where: { id: input.cooperativeId } });
        if (!cooperative) {
            throw new common_1.BadRequestException('Unknown cooperativeId — the member must be joining an existing cooperative');
        }
        const existing = await this.prisma.member.findFirst({
            where: { OR: [{ email: input.email }, { phone: input.phone }] },
        });
        if (existing)
            throw new common_1.ConflictException('A member with that email or phone already exists');
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
        }
        catch (err) {
            this.logger.warn(`provisionAccount not available yet for member ${member.id}: ${err.message}`);
        }
        return { ...(await this.issueTokens(member)), member: toPublicMember(member) };
    }
    async login(input) {
        const member = await this.prisma.member.findUnique({ where: { email: input.email } });
        if (!member)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const valid = await bcrypt.compare(input.password, member.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid email or password');
        return { ...(await this.issueTokens(member)), member: toPublicMember(member) };
    }
    async refresh(refreshToken) {
        let payload;
        try {
            payload = await this.refreshTokens.verifyAsync(refreshToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const member = await this.prisma.member.findUnique({ where: { id: payload.sub } });
        if (!member)
            throw new common_1.UnauthorizedException('Member no longer exists');
        return this.issueTokens(member);
    }
    async me(memberId) {
        const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
        return toPublicMember(member);
    }
    async verifyAccessToken(token) {
        return this.accessTokens.verifyAsync(token);
    }
    async issueTokens(member) {
        const payload = { sub: member.id, role: member.role, cooperativeId: member.cooperativeId };
        return {
            accessToken: await this.accessTokens.signAsync(payload),
            refreshToken: await this.refreshTokens.signAsync(payload),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService])
], AuthService);
//# sourceMappingURL=auth.service.js.map