import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { CreditScoreService } from './credit-score.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LoansController],
  providers: [LoansService, CreditScoreService],
  exports: [LoansService],
})
export class LoansModule {}
