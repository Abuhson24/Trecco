import { Body, Controller, Get, Param, Post, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreditScoreService } from './credit-score.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { loanReceiptMulterOptions } from '../../common/config/multer.config';

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(
    private readonly loans: LoansService,
    private readonly creditScore: CreditScoreService,
  ) {}

  @Post('request')
  async request(@Req() req: any, @Body() body: { amountRequested: number; purpose: string; repaymentMonths: number }) {
    return this.loans.requestLoan(req.user.memberId, body);
  }

  @Get('my-loans')
  async myLoans(@Req() req: any) {
    return this.loans.myLoans(req.user.memberId);
  }

  @Get('credit-score')
  async getCreditScore(@Req() req: any) {
    return this.creditScore.getCreditScore(req.user.memberId);
  }

  @Post(':id/repay/automated')
  async repayAutomated(@Req() req: any, @Param('id') id: string, @Body() body: { amount: number }) {
    return this.loans.repayAutomated(req.user.memberId, id, body.amount);
  }

  @Post(':id/repay/manual')
  @UseInterceptors(FileInterceptor('receipt', loanReceiptMulterOptions))
  async repayManual(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { amount: string; reference?: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded — field name must be "receipt"');
    }
    const receiptUrl = `/uploads/loan-receipts/${file.filename}`;
    return this.loans.submitManualRepayment(req.user.memberId, id, Number(body.amount), body.reference, receiptUrl);
  }

  @Get('committee/pending')
  async committeePending(@Req() req: any) {
    return this.loans.pendingForCommittee(req.user.memberId);
  }

  @Post(':id/vote')
  async vote(@Req() req: any, @Param('id') id: string, @Body() body: { approve: boolean }) {
    return this.loans.vote(req.user.memberId, id, body.approve);
  }

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Get('admin/pending-approval')
  async pendingApproval() {
    return this.loans.pendingApprovalForAdmin();
  }

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('admin/:id/approve')
  async approve(@Param('id') id: string, @Body() body: { amountApproved?: number }) {
    return this.loans.approveAndDisburse(id, body?.amountApproved);
  }

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('admin/:id/reject')
  async reject(@Param('id') id: string) {
    return this.loans.rejectByAdmin(id);
  }

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Get('admin/repayments/pending')
  async pendingRepayments() {
    return this.loans.pendingRepaymentsForAdmin();
  }

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('admin/repayments/:id/confirm')
  async confirmRepayment(@Req() req: any, @Param('id') id: string) {
    return this.loans.confirmManualRepayment(req.user.memberId, id);
  }

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('admin/repayments/:id/reject')
  async rejectRepayment(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.loans.rejectManualRepayment(req.user.memberId, id, body.reason);
  }

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('admin/committee/:memberId')
  async setCommitteeMember(@Param('memberId') memberId: string, @Body() body: { isCommitteeMember: boolean }) {
    return this.loans.setCommitteeMember(memberId, body.isCommitteeMember);
  }
}
