import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MarketplaceModule, AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
