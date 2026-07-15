import { Injectable } from '@nestjs/common';

/**
 * Thin wrapper around Xpress Wallet's API (https://payment.xpress-wallet.com/api/v1).
 *
 * Same convention as apps/api/src/modules/wallet/wallet.service.ts's Providus
 * stubs: every method that actually needs to call out is left as a TODO with
 * the exact contract we expect, so whoever fills it in only has to swap the
 * body of the method, not touch any caller. CardsService never talks to
 * fetch()/axios directly — everything about "how do we call Xpress Wallet"
 * lives in this one file.
 *
 * Once you have Xpress Wallet's docs, fill in:
 *   - the auth header they expect (Bearer token? x-api-key? request signing?)
 *   - exact request/response field names for each call below
 *   - their webhook payload shape + signature header, if card status updates
 *     (e.g. physical card produced/dispatched) arrive async instead of in the
 *     synchronous response
 */
@Injectable()
export class XpressWalletClient {
  private readonly baseUrl = process.env.XPRESS_WALLET_BASE_URL ?? 'https://payment.xpress-wallet.com/api/v1';
  private readonly apiKey = process.env.XPRESS_WALLET_API_KEY ?? '';

  private headers() {
    return {
      'Content-Type': 'application/json',
      // TODO(xpress-wallet): confirm the auth scheme — placeholder is Bearer.
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  // TODO(xpress-wallet): issue a virtual card for a member.
  // Expected shape once wired up:
  //   POST `${this.baseUrl}/cards/virtual`
  //   body: { customerReference: memberId, ... }
  //   returns: { cardId, maskedPan, expiryMonth, expiryYear }
  async issueVirtualCard(params: {
    memberId: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<{ cardId: string; maskedPan: string; expiryMonth: number; expiryYear: number }> {
    throw new Error('Not implemented — needs Xpress Wallet API docs for virtual card issuance');
  }

  // TODO(xpress-wallet): kick off production of a physical card + register
  // the delivery address with them, if Xpress Wallet handles fulfillment
  // themselves. If they only mint the card and Trecco handles courier
  // dispatch separately, this call should just return the card reference and
  // CardsService.dispatch() below stays purely internal (no Xpress Wallet call).
  //   POST `${this.baseUrl}/cards/physical`
  //   body: { customerReference: memberId, deliveryAddress: {...}, ... }
  //   returns: { cardId, maskedPan, expiryMonth, expiryYear }
  async issuePhysicalCard(params: {
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
  }): Promise<{ cardId: string; maskedPan: string; expiryMonth: number; expiryYear: number }> {
    throw new Error('Not implemented — needs Xpress Wallet API docs for physical card issuance');
  }

  // TODO(xpress-wallet): block/deactivate a card (lost/stolen, member offboarded).
  async blockCard(xpressWalletCardId: string): Promise<void> {
    throw new Error('Not implemented — needs Xpress Wallet API docs');
  }

  // TODO(xpress-wallet): verify the signature header on inbound webhooks
  // (card status changes, dispatch confirmation, etc.) before trusting the
  // payload — exact header name TBD from their docs, same pattern as
  // ProvidusWebhookController.
  verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
    throw new Error('Not implemented — needs Xpress Wallet webhook signing docs');
  }
}
