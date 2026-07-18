import { Controller, Get } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';

// Deliberately unguarded — reachable by a visitor with no account yet, so
// they can pick a cooperative to join as part of signing up.
@Controller('cooperative-public')
export class CooperativePublicController {
  constructor(private readonly cooperative: CooperativeService) {}

  @Get('list')
  async list() {
    return this.cooperative.listPublic();
  }
}
