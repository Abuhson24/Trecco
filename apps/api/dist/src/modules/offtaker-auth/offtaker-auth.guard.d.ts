import { CanActivate, ExecutionContext } from '@nestjs/common';
import { OfftakerAuthService } from './offtaker-auth.service';
export declare class OfftakerAuthGuard implements CanActivate {
    private readonly offtakerAuth;
    constructor(offtakerAuth: OfftakerAuthService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
