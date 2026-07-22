import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BillsService } from './bills.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('bills')
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Get('data-variations')
  async getDataVariations(@Query('serviceId') serviceId: string) {
    return this.bills.getDataVariations(serviceId);
  }

  @Post('airtime')
  async buyAirtime(@Req() req: any, @Body() body: { serviceId: string; phone: string; amount: number }) {
    return this.bills.buyAirtime(req.user.memberId, body.serviceId, body.phone, body.amount);
  }

  @Post('data')
  async buyData(
    @Req() req: any,
    @Body() body: { serviceId: string; phone: string; variationCode: string; amount: number },
  ) {
    return this.bills.buyData(req.user.memberId, body.serviceId, body.phone, body.variationCode, body.amount);
  }

  @Get('requery')
  async requery(@Query('requestId') requestId: string) {
    return this.bills.requeryTransaction(requestId);
  }
}
