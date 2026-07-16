import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
}
