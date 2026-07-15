"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfftakerAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const offtaker_auth_service_1 = require("./offtaker-auth.service");
let OfftakerAuthGuard = class OfftakerAuthGuard {
    constructor(offtakerAuth) {
        this.offtakerAuth = offtakerAuth;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const header = req.headers['authorization'];
        const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
        if (!token)
            throw new common_1.UnauthorizedException('Missing bearer token');
        try {
            const payload = await this.offtakerAuth.verifyToken(token);
            req.offtaker = { offtakerId: payload.sub };
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired offtaker token');
        }
    }
};
exports.OfftakerAuthGuard = OfftakerAuthGuard;
exports.OfftakerAuthGuard = OfftakerAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [offtaker_auth_service_1.OfftakerAuthService])
], OfftakerAuthGuard);
//# sourceMappingURL=offtaker-auth.guard.js.map