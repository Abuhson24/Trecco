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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    const cooperative = await prisma.cooperative.upsert({
        where: { id: 'seed-coop-1' },
        update: {},
        create: {
            id: 'seed-coop-1',
            name: 'Trecco Demo Cooperative',
            country: 'Nigeria',
            focusArea: 'Agribusiness',
            loanRatePolicy: 5.0,
            loanCapPercent: 30.0,
            committeeSize: 5,
        },
    });
    await prisma.cooperativeAccount.upsert({
        where: { cooperativeId: cooperative.id },
        update: {},
        create: {
            cooperativeId: cooperative.id,
            providusAccountNumber: 'SEED-COOP-0000000001',
            balance: 1_000_000,
        },
    });
    const adminPasswordHash = await bcrypt.hash('Admin12345', 10);
    const admin = await prisma.member.upsert({
        where: { email: 'admin@trecco.test' },
        update: {},
        create: {
            cooperativeId: cooperative.id,
            role: 'COOP_ADMIN',
            fullName: 'Demo Admin',
            email: 'admin@trecco.test',
            phone: '08000000001',
            passwordHash: adminPasswordHash,
        },
    });
    await prisma.personalAccount.upsert({
        where: { memberId: admin.id },
        update: {},
        create: {
            memberId: admin.id,
            providusAccountNumber: 'SEED-PA-0000000001',
            providusAccountRef: 'seed-ref-admin-1',
            balance: 50_000,
        },
    });
    const memberPasswordHash = await bcrypt.hash('Member1234', 10);
    const member = await prisma.member.upsert({
        where: { email: 'member@trecco.test' },
        update: {},
        create: {
            cooperativeId: cooperative.id,
            role: 'MEMBER',
            fullName: 'Demo Member',
            email: 'member@trecco.test',
            phone: '08000000002',
            passwordHash: memberPasswordHash,
        },
    });
    await prisma.personalAccount.upsert({
        where: { memberId: member.id },
        update: {},
        create: {
            memberId: member.id,
            providusAccountNumber: 'SEED-PA-0000000002',
            providusAccountRef: 'seed-ref-member-1',
            balance: 10_000,
        },
    });
    console.log('Seeded:');
    console.log(`  Cooperative:  ${cooperative.id} (${cooperative.name})`);
    console.log('  Admin login:  admin@trecco.test / Admin12345');
    console.log('  Member login: member@trecco.test / Member1234');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map