import { WalletService } from './wallet.service';
export declare class WalletController {
    private readonly wallet;
    constructor(wallet: WalletService);
    getBalance(req: any): Promise<{
        personalBalance: import("@prisma/client/runtime/library").Decimal;
        cooperativeSavings: number | import("@prisma/client/runtime/library").Decimal;
        providusAccountNumber: string;
    }>;
    moveToSavings(req: any, body: {
        amount: number;
    }): Promise<{
        personalBalance: import("@prisma/client/runtime/library").Decimal;
        cooperativeSavings: number | import("@prisma/client/runtime/library").Decimal;
        providusAccountNumber: string;
    }>;
    withdraw(req: any, body: {
        amount: number;
        destinationBankAccount: string;
    }): Promise<void>;
}
