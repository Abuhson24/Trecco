import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { OfftakerAuthModule } from '../offtaker-auth/offtaker-auth.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [OfftakerAuthModule, AuthModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
