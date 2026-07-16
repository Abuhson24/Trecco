import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OfftakerAuthGuard } from '../offtaker-auth/offtaker-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { demandImageMulterOptions } from '../../common/config/multer.config';

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

  // Admin view — every demand, every status, every offtaker, with offers.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Get('admin/demands')
  async listAllDemandsForAdmin() {
    return this.marketplace.listAllDemandsForAdmin();
  }

  // Members browse the open demand board.
  @UseGuards(JwtAuthGuard)
  @Get('demands')
  async listOpenDemands(@Req() req: any) {
    return this.marketplace.listOpenDemands(req.user.cooperativeId);
  }

  // Offtaker views their own demands, every status.
  @UseGuards(OfftakerAuthGuard)
  @Get('my-demands')
  async listMyDemands(@Req() req: any) {
    return this.marketplace.listMyDemands(req.offtaker.offtakerId);
  }

  // A member offers to supply a specific demand.
  @UseGuards(JwtAuthGuard)
  @Post('demands/:demandId/offers')
  async submitOffer(@Req() req: any, @Param('demandId') demandId: string, @Body() body: any) {
    return this.marketplace.submitOffer(req.user.memberId, demandId, body);
  }

  // Member views their own offers across every demand, with live status.
  @UseGuards(JwtAuthGuard)
  @Get('my-offers')
  async listMyOffers(@Req() req: any) {
    return this.marketplace.listMyOffers(req.user.memberId);
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
  // Offtaker edits their own demand. Ownership enforced in the service.
  @UseGuards(OfftakerAuthGuard)
  @Patch('demands/:id')
  async updateDemand(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.marketplace.updateDemandAsOfftaker(req.offtaker.offtakerId, id, body);
  }

  // Offtaker deletes their own demand. Blocked in the service if offers exist.
  @UseGuards(OfftakerAuthGuard)
  @Delete('demands/:id')
  async deleteDemand(@Req() req: any, @Param('id') id: string) {
    return this.marketplace.deleteDemandAsOfftaker(req.offtaker.offtakerId, id);
  }

  // Offtaker uploads/replaces the photo for their own demand.
  @UseGuards(OfftakerAuthGuard)
  @Post('demands/:id/image')
  @UseInterceptors(FileInterceptor('image', demandImageMulterOptions))
  async uploadDemandImage(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded — field name must be "image"');
    }
    const imageUrl = `/uploads/demands/${file.filename}`;
    return this.marketplace.attachDemandImage(req.offtaker.offtakerId, id, imageUrl);
  }

  // Marks an already-accepted offer as fulfilled (real supply delivered).
  // Terminal status — the offer record is never deleted, just transitioned.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Post('offers/:offerId/fulfill')
  async fulfillOffer(@Param('offerId') offerId: string) {
    return this.marketplace.fulfillOffer(offerId);
  }
}
