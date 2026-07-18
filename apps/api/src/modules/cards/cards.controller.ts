import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CardType } from '@prisma/client';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Post('request')
  async request(
    @Req() req: any,
    @Body()
    body: {
      cardType: CardType;
      deliveryAddress?: {
        fullName: string;
        phone: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        country: string;
      };
    },
  ) {
    return this.cards.requestCard(req.user.memberId, body.cardType, body.deliveryAddress);
  }

  @Get('my-requests')
  async myRequests(@Req() req: any) {
    return this.cards.myRequests(req.user.memberId);
  }

  @Get('my-cards')
  async myCards(@Req() req: any) {
    return this.cards.myCards(req.user.memberId);
  }

  @Post('requests/:id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.cards.cancel(req.user.memberId, id);
  }

  @UseGuards(RolesGuard)
  @Roles('TREMMA_SUPER_ADMIN')
  @Get('admin/requests/pending')
  async pending() {
    return this.cards.pendingForAdmin();
  }

  @UseGuards(RolesGuard)
  @Roles('TREMMA_SUPER_ADMIN')
  @Get('admin/requests/awaiting-dispatch')
  async awaitingDispatch() {
    return this.cards.awaitingDispatchForAdmin();
  }

  @UseGuards(RolesGuard)
  @Roles('TREMMA_SUPER_ADMIN')
  @Post('admin/requests/:id/approve')
  async approve(@Req() req: any, @Param('id') id: string) {
    return this.cards.approve(req.user.memberId, id);
  }

  @UseGuards(RolesGuard)
  @Roles('TREMMA_SUPER_ADMIN')
  @Post('admin/requests/:id/reject')
  async reject(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.cards.reject(req.user.memberId, id, body.reason);
  }

  @UseGuards(RolesGuard)
  @Roles('TREMMA_SUPER_ADMIN')
  @Post('admin/requests/:id/retry-issuance')
  async retryIssuance(@Param('id') id: string) {
    return this.cards.issue(id);
  }

  @UseGuards(RolesGuard)
  @Roles('TREMMA_SUPER_ADMIN')
  @Post('admin/requests/:id/dispatch')
  async dispatch(@Req() req: any, @Param('id') id: string, @Body() body: { courier: string; trackingReference: string }) {
    return this.cards.dispatch(req.user.memberId, id, body.courier, body.trackingReference);
  }

  @UseGuards(RolesGuard)
  @Roles('TREMMA_SUPER_ADMIN')
  @Post('admin/requests/:id/delivered')
  async delivered(@Param('id') id: string) {
    return this.cards.markDelivered(id);
  }
}
