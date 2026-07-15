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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceController = void 0;
const common_1 = require("@nestjs/common");
const marketplace_service_1 = require("./marketplace.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const offtaker_auth_guard_1 = require("../offtaker-auth/offtaker-auth.guard");
let MarketplaceController = class MarketplaceController {
    constructor(marketplace) {
        this.marketplace = marketplace;
    }
    async createDemandAsOfftaker(req, body) {
        return this.marketplace.createDemandAsOfftaker(req.offtaker.offtakerId, body);
    }
    async createDemandAsAdmin(body) {
        return this.marketplace.createDemandAsAdmin(body);
    }
    async listOpenDemands(req) {
        return this.marketplace.listOpenDemands(req.user.cooperativeId);
    }
    async submitOffer(req, demandId, body) {
        return this.marketplace.submitOffer(req.user.memberId, demandId, body);
    }
    async listOffers(demandId) {
        return this.marketplace.listOffers(demandId);
    }
    async acceptOffer(offerId) {
        return this.marketplace.acceptOffer(offerId);
    }
    async declineOffer(offerId) {
        return this.marketplace.declineOffer(offerId);
    }
};
exports.MarketplaceController = MarketplaceController;
__decorate([
    (0, common_1.UseGuards)(offtaker_auth_guard_1.OfftakerAuthGuard),
    (0, common_1.Post)('demands'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "createDemandAsOfftaker", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Post)('admin/demands'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "createDemandAsAdmin", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('demands'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "listOpenDemands", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('demands/:demandId/offers'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('demandId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "submitOffer", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Get)('demands/:demandId/offers'),
    __param(0, (0, common_1.Param)('demandId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "listOffers", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Post)('offers/:offerId/accept'),
    __param(0, (0, common_1.Param)('offerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "acceptOffer", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Post)('offers/:offerId/decline'),
    __param(0, (0, common_1.Param)('offerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketplaceController.prototype, "declineOffer", null);
exports.MarketplaceController = MarketplaceController = __decorate([
    (0, common_1.Controller)('marketplace'),
    __metadata("design:paramtypes", [marketplace_service_1.MarketplaceService])
], MarketplaceController);
//# sourceMappingURL=marketplace.controller.js.map