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
  // --- Electricity ---

  @Post('electricity/verify-meter')
  async verifyMeter(
    @Body() body: { serviceId: string; billersCode: string; meterType: 'prepaid' | 'postpaid' },
  ) {
    return this.bills.verifyMeter(body.serviceId, body.billersCode, body.meterType);
  }

  @Post('electricity')
  async buyElectricity(
    @Req() req: any,
    @Body()
    body: {
      serviceId: string;
      billersCode: string;
      meterType: 'prepaid' | 'postpaid';
      amount: number;
      phone: string;
    },
  ) {
    return this.bills.buyElectricity(
      req.user.memberId,
      body.serviceId,
      body.billersCode,
      body.meterType,
      body.amount,
      body.phone,
    );
  }

  // --- Education ---

  @Get('education-variations')
  async getEducationVariations(@Query('serviceId') serviceId: string) {
    return this.bills.getEducationVariations(serviceId);
  }

  @Post('education/verify-profile')
  async verifyEducationProfile(
    @Body() body: { serviceId: string; billersCode: string; variationCode: string },
  ) {
    return this.bills.verifyEducationProfile(body.serviceId, body.billersCode, body.variationCode);
  }

  @Post('education')
  async buyEducation(
    @Req() req: any,
    @Body() body: { serviceId: string; billersCode: string; variationCode: string; amount: number; phone: string },
  ) {
    return this.bills.buyEducation(
      req.user.memberId,
      body.serviceId,
      body.billersCode,
      body.variationCode,
      body.amount,
      body.phone,
    );
  }
}
