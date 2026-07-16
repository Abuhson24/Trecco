import { Module } from '@nestjs/common';
import { CooperativeController } from './cooperative.controller';
import { CooperativeService } from './cooperative.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CooperativeController],
  providers: [CooperativeService],
  exports: [CooperativeService],
})
export class CooperativeModule {}
