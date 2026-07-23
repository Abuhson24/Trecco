import { Body, Controller, Post, Get, Query, Req, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { SettingsService } from '../settings/settings.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly settings: SettingsService,
  ) {}

  @Get('balance')
  async getBalance(@Req() req: any) {
    return this.wallet.getBalance(req.user.memberId, req.user.panicMode);
  }

  @Post('setup-identity')
  async setupWalletIdentity(@Req() req: any, @Body() body: { bvn: string; dateOfBirth: string }) {
    await this.wallet.setupWalletIdentity(req.user.memberId, body.bvn, body.dateOfBirth);
    return this.wallet.getBalance(req.user.memberId, req.user.panicMode);
  }

  @Post('move-to-savings')
  async moveToSavings(@Req() req: any, @Body() body: { amount: number }) {
    await this.wallet.moveToSavings(req.user.memberId, body.amount);
    return this.wallet.getBalance(req.user.memberId, req.user.panicMode);
  }

  @Post('withdraw')
  async withdraw(
    @Req() req: any,
    @Body() body: { amount: number; sortCode: string; accountNumber: string; accountName: string; narration?: string; pin: string },
  ) {
    const pinValid = await this.settings.verifyTransactionPin(req.user.memberId, body.pin);
    if (!pinValid) throw new UnauthorizedException('Incorrect transaction PIN');
    await this.wallet.withdraw(req.user.memberId, body.amount, body.sortCode, body.accountNumber, body.accountName, body.narration);
    return this.wallet.getBalance(req.user.memberId, req.user.panicMode);
  }

  @Get('banks')
  async bankList() {
    return this.wallet.bankList();
  }

  @Get('resolve-account')
  async resolveAccountName(@Query('sortCode') sortCode: string, @Query('accountNumber') accountNumber: string) {
    return this.wallet.resolveAccountName(sortCode, accountNumber);
  }

  @Get('find-recipient')
  async findRecipient(@Query('contact') contact: string) {
    return this.wallet.findRecipientByContact(contact);
  }

  @Post('send-to-trecco')
  async sendToTrecco(@Req() req: any, @Body() body: { recipientContact: string; amount: number; pin: string }) {
    const pinValid = await this.settings.verifyTransactionPin(req.user.memberId, body.pin);
    if (!pinValid) throw new UnauthorizedException('Incorrect transaction PIN');
    await this.wallet.sendToTrecco(req.user.memberId, body.recipientContact, body.amount);
    return this.wallet.getBalance(req.user.memberId, req.user.panicMode);
  }

  @Get('transactions')
  async listTransactions(@Req() req: any, @Query('page') page?: string, @Query('perPage') perPage?: string) {
    return this.wallet.listTransactions(req.user.memberId, page ? Number(page) : 1, perPage ? Number(perPage) : 20);
  }
}
