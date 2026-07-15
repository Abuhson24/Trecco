import { WalletService } from './wallet.service';
export declare class ProvidusWebhookController {
    private readonly wallet;
    constructor(wallet: WalletService);
    handle(payload: unknown, headers: Record<string, string>): Promise<void>;
}
