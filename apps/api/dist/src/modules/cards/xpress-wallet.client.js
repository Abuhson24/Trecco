"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XpressWalletClient = void 0;
const common_1 = require("@nestjs/common");
let XpressWalletClient = class XpressWalletClient {
    constructor() {
        this.baseUrl = process.env.XPRESS_WALLET_BASE_URL ?? 'https://payment.xpress-wallet.com/api/v1';
        this.apiKey = process.env.XPRESS_WALLET_API_KEY ?? '';
    }
    headers() {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
        };
    }
    async issueVirtualCard(params) {
        throw new Error('Not implemented — needs Xpress Wallet API docs for virtual card issuance');
    }
    async issuePhysicalCard(params) {
        throw new Error('Not implemented — needs Xpress Wallet API docs for physical card issuance');
    }
    async blockCard(xpressWalletCardId) {
        throw new Error('Not implemented — needs Xpress Wallet API docs');
    }
    verifyWebhookSignature(rawBody, signatureHeader) {
        throw new Error('Not implemented — needs Xpress Wallet webhook signing docs');
    }
};
exports.XpressWalletClient = XpressWalletClient;
exports.XpressWalletClient = XpressWalletClient = __decorate([
    (0, common_1.Injectable)()
], XpressWalletClient);
//# sourceMappingURL=xpress-wallet.client.js.map