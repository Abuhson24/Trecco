import { PrismaService } from '../../prisma/prisma.service';
export declare class WalletService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getBalance(memberId: string): Promise<{
        personalBalance: import("@prisma/client/runtime/library").Decimal;
        cooperativeSavings: number | import("@prisma/client/runtime/library").Decimal;
        providusAccountNumber: string;
    }>;
    provisionAccount(memberId: string): Promise<void>;
    handleProvidusWebhook(payload: unknown): Promise<void>;
    moveToSavings(memberId: string, amount: number): Promise<void>;
    withdraw(memberId: string, amount: number, destinationBankAccount: string): Promise<void>;
}
