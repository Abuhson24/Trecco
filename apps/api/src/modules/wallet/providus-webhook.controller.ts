import { Body, Controller, Post, Headers } from '@nestjs/common';
import { WalletService } from './wallet.service';

// Not behind the standard JWT auth guard — Providus authenticates via a
// signature header instead (exact header name TBD from their docs).
// Keep this endpoint's logic minimal: verify, then delegate to WalletService.
@Controller('webhooks/providus')
export class ProvidusWebhookController {
  constructor(private readonly wallet: WalletService) {}

  @Post()
  async handle(@Body() payload: unknown, @Headers() headers: Record<string, string>) {
    return this.wallet.handleProvidusWebhook(payload);
  }
}
