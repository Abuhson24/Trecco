import { forwardRef, Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { ProvidusWebhookController } from './providus-webhook.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [WalletController, ProvidusWebhookController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
