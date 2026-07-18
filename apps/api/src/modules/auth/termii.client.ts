import { Injectable, Logger } from '@nestjs/common';

/**
 * Thin wrapper around Termii's Messaging API (https://developers.termii.com).
 * Used specifically for password-reset codes.
 *
 * Uses the DND (transactional) route, not the generic/promotional route —
 * Termii's own docs warn that sending OTPs over the generic route risks
 * delivery failures or getting the sender ID blocked. This is a real,
 * security-relevant detail, not a stylistic choice.
 *
 * Same convention as XpressWalletClient: this is the only file in the
 * codebase that knows the shape of Termii's API. Callers never see raw
 * fetch/axios calls to Termii.
 */
@Injectable()
export class TermiiClient {
  private readonly logger = new Logger(TermiiClient.name);
  private readonly baseUrl = process.env.TERMII_BASE_URL ?? 'https://api.ng.termii.com/api';
  private readonly apiKey = process.env.TERMII_API_KEY ?? '';
  private readonly senderId = process.env.TERMII_SENDER_ID ?? 'Trecco';

  // Termii expects international format without a leading '+' (e.g.
  // 2348011112222). Nigerian numbers in our DB are stored local-format with
  // a leading 0 (e.g. 08011112222) — convert here so callers never have to
  // think about phone number formatting.
  private toInternational(localPhone: string): string {
    const digitsOnly = localPhone.replace(/\D/g, '');
    if (digitsOnly.startsWith('234')) return digitsOnly;
    if (digitsOnly.startsWith('0')) return `234${digitsOnly.slice(1)}`;
    return digitsOnly;
  }

  async sendSms(toLocalPhone: string, message: string): Promise<void> {
    if (!this.apiKey) {
      // No key configured yet — log instead of throwing, so the rest of the
      // reset flow (code generation, expiry, verification) can still be
      // built and tested locally before Termii credits/config are live.
      this.logger.warn(
        `TERMII_API_KEY not set — SMS not actually sent. Would have sent to ${toLocalPhone}: "${message}"`,
      );
      return;
    }

    const res = await fetch(`${this.baseUrl}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: this.toInternational(toLocalPhone),
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: 'dnd', // transactional route — required for OTP/reset codes, not "generic"
        api_key: this.apiKey,
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || body.code !== 'ok') {
      this.logger.error(`Termii send failed: ${res.status} ${JSON.stringify(body)}`);
      throw new Error('Failed to send SMS — please try again shortly');
    }
  }
}
