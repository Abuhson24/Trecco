import { Injectable, Logger } from '@nestjs/common';

/**
 * Thin client for Xpress Wallet's merchant API. This is a single shared
 * merchant-level session (one login for ALL member wallet operations) —
 * NOT per-member auth. Xpress Wallet returns the session as
 * X-Access-Token/X-Refresh-Token RESPONSE HEADERS from /auth/login, not a
 * body field, so those are read and cached in memory here, then sent back
 * as request headers on every subsequent call.
 *
 * On a 401, we assume the access token expired, clear it, and retry once —
 * a fresh login will happen automatically on the retry via ensureAuthenticated().
 */
@Injectable()
export class XpressWalletClient {
  private readonly logger = new Logger(XpressWalletClient.name);
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    const baseUrl = process.env.XPRESS_WALLET_BASE_URL;
    const email = process.env.XPRESS_WALLET_EMAIL;
    const password = process.env.XPRESS_WALLET_PASSWORD;
    if (!baseUrl || !email || !password) {
      throw new Error(
        'XPRESS_WALLET_BASE_URL, XPRESS_WALLET_EMAIL, and XPRESS_WALLET_PASSWORD must be set — see .env.example',
      );
    }
    this.baseUrl = baseUrl;
    this.email = email;
    this.password = password;
  }

  private async login(): Promise<void> {
    this.logger.log('Logging in to Xpress Wallet…');
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Xpress Wallet requires email/password base64-encoded in the login
      // body (confirmed by decoding their own Postman example values) —
      // sending plain text here causes a misleading "Invalid e-mail" 400.
      body: JSON.stringify({
        email: Buffer.from(this.email).toString('base64'),
        password: Buffer.from(this.password).toString('base64'),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Xpress Wallet login failed (${res.status}): ${body}`);
    }

    const accessToken = res.headers.get('x-access-token');
    const refreshToken = res.headers.get('x-refresh-token');
    if (!accessToken || !refreshToken) {
      throw new Error('Xpress Wallet login succeeded but X-Access-Token/X-Refresh-Token headers were missing');
    }

    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.logger.log('Xpress Wallet login successful');
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken) {
      await this.login();
    }
  }

  // Generic authenticated request. Retries once on 401 by forcing a fresh
  // login — covers both "never logged in yet" and "token expired mid-session".
  async request<T = any>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
    await this.ensureAuthenticated();

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': this.accessToken!,
        'X-Refresh-Token': this.refreshToken!,
        ...(options.headers ?? {}),
      },
    });

    if (res.status === 401 && !retried) {
      this.logger.warn('Xpress Wallet token expired mid-session — re-authenticating and retrying once');
      this.accessToken = null;
      this.refreshToken = null;
      return this.request<T>(path, options, true);
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Xpress Wallet API error (${res.status}): ${JSON.stringify(body)}`);
    }
    return body as T;
  }
}
