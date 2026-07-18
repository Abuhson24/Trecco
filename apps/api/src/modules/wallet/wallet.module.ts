import { forwardRef, Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { XpressWalletClient } from './xpress-wallet.client';
import { ProvidusWebhookController } from './providus-webhook.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [WalletController, ProvidusWebhookController],
  providers: [WalletService, XpressWalletClient],
  exports: [WalletService],
})
export class WalletModule {}
