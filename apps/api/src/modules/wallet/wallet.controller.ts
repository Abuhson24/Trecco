import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('balance')
  async getBalance(@Req() req: any) {
    return this.wallet.getBalance(req.user.memberId);
  }

  @Post('move-to-savings')
  async moveToSavings(@Req() req: any, @Body() body: { amount: number }) {
    await this.wallet.moveToSavings(req.user.memberId, body.amount);
    return this.wallet.getBalance(req.user.memberId);
  }

  @Post('withdraw')
  async withdraw(@Req() req: any, @Body() body: { amount: number; destinationBankAccount: string }) {
    return this.wallet.withdraw(req.user.memberId, body.amount, body.destinationBankAccount);
  }
}
