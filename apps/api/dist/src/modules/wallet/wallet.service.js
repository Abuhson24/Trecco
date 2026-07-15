"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let WalletService = class WalletService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBalance(memberId) {
        const personalAccount = await this.prisma.personalAccount.findUnique({
            where: { memberId },
        });
        if (!personalAccount) {
            throw new common_1.NotFoundException('No personal account provisioned for this member yet — signup should have called provisionAccount');
        }
        const member = await this.prisma.member.findUniqueOrThrow({
            where: { id: memberId },
            select: { cooperativeId: true },
        });
        const cooperativeAccount = await this.prisma.cooperativeAccount.findUnique({
            where: { cooperativeId: member.cooperativeId },
        });
        return {
            personalBalance: personalAccount.balance,
            cooperativeSavings: cooperativeAccount?.balance ?? 0,
            providusAccountNumber: personalAccount.providusAccountNumber,
        };
    }
    async provisionAccount(memberId) {
        throw new Error('Not implemented — needs Providus API docs');
    }
    async handleProvidusWebhook(payload) {
        throw new Error('Not implemented — needs Providus API docs');
    }
    async moveToSavings(memberId, amount) {
        if (amount <= 0)
            throw new Error('Amount must be positive');
        const personalAccount = await this.prisma.personalAccount.findUnique({ where: { memberId } });
        if (!personalAccount)
            throw new common_1.NotFoundException('No personal account for this member');
        if (Number(personalAccount.balance) < amount)
            throw new Error('Insufficient personal account balance');
        const member = await this.prisma.member.findUniqueOrThrow({
            where: { id: memberId },
            select: { cooperativeId: true },
        });
        const cooperativeAccount = await this.prisma.cooperativeAccount.findUnique({
            where: { cooperativeId: member.cooperativeId },
        });
        if (!cooperativeAccount)
            throw new common_1.NotFoundException('No cooperative account provisioned for this cooperative');
        await this.prisma.$transaction([
            this.prisma.personalAccount.update({
                where: { id: personalAccount.id },
                data: { balance: { decrement: amount } },
            }),
            this.prisma.cooperativeAccount.update({
                where: { id: cooperativeAccount.id },
                data: { balance: { increment: amount } },
            }),
            this.prisma.transaction.create({
                data: {
                    type: 'MOVE_TO_SAVINGS',
                    status: 'COMPLETED',
                    amount,
                    reference: `internal-${Date.now()}-${memberId}`,
                    method: 'internal',
                    personalAccountId: personalAccount.id,
                    cooperativeAccountId: cooperativeAccount.id,
                },
            }),
        ]);
    }
    async withdraw(memberId, amount, destinationBankAccount) {
        throw new Error('Not implemented — needs Providus API docs + fee decision');
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map