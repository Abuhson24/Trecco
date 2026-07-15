import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OfftakerAuthGuard } from '../offtaker-auth/offtaker-auth.guard';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  // Offtaker posts their own demand. offtakerId is taken from the verified
  // token inside the service call, never trusted from the request body.
  @UseGuards(OfftakerAuthGuard)
  @Post('demands')
  async createDemandAsOfftaker(@Req() req: any, @Body() body: any) {
    return this.marketplace.createDemandAsOfftaker(req.offtaker.offtakerId, body);
  }

  // Admin posts a demand on behalf of an offtaker (existing or new).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('admin/demands')
  async createDemandAsAdmin(@Body() body: any) {
    return this.marketplace.createDemandAsAdmin(body);
  }

  // Members browse the open demand board.
  @UseGuards(JwtAuthGuard)
  @Get('demands')
  async listOpenDemands(@Req() req: any) {
    return this.marketplace.listOpenDemands(req.user.cooperativeId);
  }

  // A member offers to supply a specific demand.
  @UseGuards(JwtAuthGuard)
  @Post('demands/:demandId/offers')
  async submitOffer(@Req() req: any, @Param('demandId') demandId: string, @Body() body: any) {
    return this.marketplace.submitOffer(req.user.memberId, demandId, body);
  }

  // Admin views every offer against a demand.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Get('demands/:demandId/offers')
  async listOffers(@Param('demandId') demandId: string) {
    return this.marketplace.listOffers(demandId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('offers/:offerId/accept')
  async acceptOffer(@Param('offerId') offerId: string) {
    return this.marketplace.acceptOffer(offerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('offers/:offerId/decline')
  async declineOffer(@Param('offerId') offerId: string) {
    return this.marketplace.declineOffer(offerId);
  }
}
