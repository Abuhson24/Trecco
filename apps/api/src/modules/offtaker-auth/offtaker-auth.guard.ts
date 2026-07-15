import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { OfftakerAuthService } from './offtaker-auth.service';

// Parallel to JwtAuthGuard (member auth), but for the offtaker identity type.
// Deliberately not merged with JwtAuthGuard — see the comment in
// offtaker-auth.service.ts for why these two stay separate.
@Injectable()
export class OfftakerAuthGuard implements CanActivate {
  constructor(private readonly offtakerAuth: OfftakerAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    try {
      const payload = await this.offtakerAuth.verifyToken(token);
      req.offtaker = { offtakerId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired offtaker token');
    }
  }
}
