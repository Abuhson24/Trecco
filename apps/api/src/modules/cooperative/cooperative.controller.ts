import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('cooperative')
@UseGuards(JwtAuthGuard)
export class CooperativeController {
  constructor(private readonly cooperative: CooperativeService) {}

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Get('members')
  async listMembers(@Req() req: any) {
    return this.cooperative.listMembers(req.user.cooperativeId);
  }

  @Get('mine')
  async mine(@Req() req: any) {
    return this.cooperative.getCooperative(req.user.cooperativeId);
  }

  // A cooperative-less member joins an existing cooperative via an
  // admin-issued token.
  @Post('join')
  async join(@Req() req: any, @Body() body: { token: string }) {
    return this.cooperative.joinByToken(req.user.memberId, body.token);
  }

  // A cooperative-less member starts a brand-new cooperative and becomes its
  // founding admin.
  @Post()
  async create(
    @Req() req: any,
    @Body() body: { cooperativeName: string; country: string; focusArea: string; isExistingCooperative: boolean },
  ) {
    return this.cooperative.createForMember(req.user.memberId, body);
  }

  @UseGuards(RolesGuard)
  @Roles('COOP_ADMIN', 'TREMMA_SUPER_ADMIN')
  @Get('mine/token')
  async myToken(@Req() req: any) {
    return this.cooperative.getMyJoinToken(req.user.cooperativeId);
  }
}
