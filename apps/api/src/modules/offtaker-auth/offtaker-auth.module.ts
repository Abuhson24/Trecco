import { Module } from '@nestjs/common';
import { OfftakerAuthController } from './offtaker-auth.controller';
import { OfftakerAuthService } from './offtaker-auth.service';
import { OfftakerAuthGuard } from './offtaker-auth.guard';

@Module({
  controllers: [OfftakerAuthController],
  providers: [OfftakerAuthService, OfftakerAuthGuard],
  exports: [OfftakerAuthService, OfftakerAuthGuard],
})
export class OfftakerAuthModule {}
