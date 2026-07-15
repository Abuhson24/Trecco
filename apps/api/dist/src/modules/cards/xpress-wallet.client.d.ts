export declare class XpressWalletClient {
    private readonly baseUrl;
    private readonly apiKey;
    private headers;
    issueVirtualCard(params: {
        memberId: string;
        customerEmail: string;
        customerPhone: string;
    }): Promise<{
        cardId: string;
        maskedPan: string;
        expiryMonth: number;
        expiryYear: number;
    }>;
    issuePhysicalCard(params: {
        memberId: string;
        customerEmail: string;
        customerPhone: string;
        deliveryAddress: {
            fullName: string;
            phone: string;
            addressLine1: string;
            addressLine2?: string;
            city: string;
            state: string;
            country: string;
        };
    }): Promise<{
        cardId: string;
        maskedPan: string;
        expiryMonth: number;
        expiryYear: number;
    }>;
    blockCard(xpressWalletCardId: string): Promise<void>;
    verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean;
}
