import { Injectable, Logger } from '@nestjs/common';

/**
 * Thin client for VTpass's bills-payment API (airtime, data). Unlike Xpress
 * Wallet, there's no login step — every request just carries static
 * api-key + secret-key (POST) or api-key + public-key (GET) headers, per
 * https://vtpass.com/documentation/authentication/.
 */
@Injectable()
export class VtpassClient {
  private readonly logger = new Logger(VtpassClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor() {
    const baseUrl = process.env.VTPASS_BASE_URL;
    const apiKey = process.env.VTPASS_API_KEY;
    const secretKey = process.env.VTPASS_SECRET_KEY;
    const publicKey = process.env.VTPASS_PUBLIC_KEY;
    if (!baseUrl || !apiKey || !secretKey || !publicKey) {
      throw new Error(
        'VTPASS_BASE_URL, VTPASS_API_KEY, VTPASS_SECRET_KEY, and VTPASS_PUBLIC_KEY must be set — see .env.example',
      );
    }
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.publicKey = publicKey;
  }

  // Request ID format required by VTpass: first 12 chars must be numeric
  // and equal to today's date+hour+minute in Africa/Lagos time (GMT+1),
  // followed by any alphanumeric suffix. Not using a UTC-based Date here
  // matters — Lagos has no DST, so GMT+1 is a fixed, safe offset.
  generateRequestId(): string {
    const now = new Date(Date.now() + 60 * 60 * 1000); // shift to GMT+1
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp =
      `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
      `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
    const suffix = Math.random().toString(36).slice(2, 10);
    return `${stamp}${suffix}`;
  }

  async post<T = any>(path: string, body: Record<string, any>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
        'secret-key': this.secretKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`VTpass API error (${res.status}): ${JSON.stringify(data)}`);
    }
    return data as T;
  }

  async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'api-key': this.apiKey,
        'public-key': this.publicKey,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`VTpass API error (${res.status}): ${JSON.stringify(data)}`);
    }
    return data as T;
  }
}
