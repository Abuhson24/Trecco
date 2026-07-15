import { Body, Controller, Post } from '@nestjs/common';
import { OfftakerAuthService } from './offtaker-auth.service';

@Controller('offtaker-auth')
export class OfftakerAuthController {
  constructor(private readonly offtakerAuth: OfftakerAuthService) {}

  @Post('signup')
  async signup(@Body() body: { companyName: string; contactEmail: string; contactPhone: string; password: string }) {
    return this.offtakerAuth.signup(body);
  }

  @Post('login')
  async login(@Body() body: { contactEmail: string; password: string }) {
    return this.offtakerAuth.login(body);
  }
}
