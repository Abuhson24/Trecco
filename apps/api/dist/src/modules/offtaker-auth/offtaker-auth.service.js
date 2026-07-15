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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfftakerAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
function toPublicOfftaker(o) {
    return { id: o.id, companyName: o.companyName, contactEmail: o.contactEmail, contactPhone: o.contactPhone, verified: o.verified };
}
let OfftakerAuthService = class OfftakerAuthService {
    constructor(prisma) {
        this.prisma = prisma;
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret)
            throw new Error('JWT_ACCESS_SECRET must be set — see .env.example');
        this.tokens = new jwt_1.JwtService({ secret, signOptions: { expiresIn: '7d' } });
    }
    async signup(input) {
        if (!input.companyName || !input.contactEmail || !input.contactPhone || !input.password) {
            throw new common_1.BadRequestException('companyName, contactEmail, contactPhone, and password are all required');
        }
        if (input.password.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        const existing = await this.prisma.offtaker.findUnique({ where: { contactEmail: input.contactEmail } });
        if (existing)
            throw new common_1.ConflictException('An offtaker with that email already exists');
        const passwordHash = await bcrypt.hash(input.password, 10);
        const offtaker = await this.prisma.offtaker.create({
            data: {
                companyName: input.companyName,
                contactEmail: input.contactEmail,
                contactPhone: input.contactPhone,
                passwordHash,
            },
        });
        return { accessToken: this.issueToken(offtaker.id), offtaker: toPublicOfftaker(offtaker) };
    }
    async login(input) {
        const offtaker = await this.prisma.offtaker.findUnique({ where: { contactEmail: input.contactEmail } });
        if (!offtaker)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const valid = await bcrypt.compare(input.password, offtaker.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid email or password');
        return { accessToken: this.issueToken(offtaker.id), offtaker: toPublicOfftaker(offtaker) };
    }
    async verifyToken(token) {
        const payload = await this.tokens.verifyAsync(token);
        if (payload.type !== 'offtaker')
            throw new common_1.UnauthorizedException('Not an offtaker token');
        return payload;
    }
    issueToken(offtakerId) {
        return this.tokens.sign({ sub: offtakerId, type: 'offtaker' });
    }
};
exports.OfftakerAuthService = OfftakerAuthService;
exports.OfftakerAuthService = OfftakerAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OfftakerAuthService);
//# sourceMappingURL=offtaker-auth.service.js.map