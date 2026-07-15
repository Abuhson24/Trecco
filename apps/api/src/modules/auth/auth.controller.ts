import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(
    @Body() body: { fullName: string; email: string; phone: string; password: string; cooperativeId: string },
  ) {
    return this.auth.signup(body);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.auth.me(req.user.memberId);
  }
}
