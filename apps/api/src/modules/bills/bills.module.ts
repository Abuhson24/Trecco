import { forwardRef, Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { VtpassClient } from './vtpass.client';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [BillsController],
  providers: [BillsService, VtpassClient],
  exports: [BillsService],
})
export class BillsModule {}
