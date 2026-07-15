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
exports.CardsController = void 0;
const common_1 = require("@nestjs/common");
const cards_service_1 = require("./cards.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let CardsController = class CardsController {
    constructor(cards) {
        this.cards = cards;
    }
    async request(req, body) {
        return this.cards.requestCard(req.user.memberId, body.cardType, body.deliveryAddress);
    }
    async myRequests(req) {
        return this.cards.myRequests(req.user.memberId);
    }
    async myCards(req) {
        return this.cards.myCards(req.user.memberId);
    }
    async cancel(req, id) {
        return this.cards.cancel(req.user.memberId, id);
    }
    async pending() {
        return this.cards.pendingForAdmin();
    }
    async awaitingDispatch() {
        return this.cards.awaitingDispatchForAdmin();
    }
    async approve(req, id) {
        return this.cards.approve(req.user.memberId, id);
    }
    async reject(req, id, body) {
        return this.cards.reject(req.user.memberId, id, body.reason);
    }
    async retryIssuance(id) {
        return this.cards.issue(id);
    }
    async dispatch(req, id, body) {
        return this.cards.dispatch(req.user.memberId, id, body.courier, body.trackingReference);
    }
    async delivered(id) {
        return this.cards.markDelivered(id);
    }
};
exports.CardsController = CardsController;
__decorate([
    (0, common_1.Post)('request'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "request", null);
__decorate([
    (0, common_1.Get)('my-requests'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "myRequests", null);
__decorate([
    (0, common_1.Get)('my-cards'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "myCards", null);
__decorate([
    (0, common_1.Post)('requests/:id/cancel'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "cancel", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Get)('admin/requests/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "pending", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Get)('admin/requests/awaiting-dispatch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "awaitingDispatch", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Post)('admin/requests/:id/approve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "approve", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Post)('admin/requests/:id/reject'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "reject", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Post)('admin/requests/:id/retry-issuance'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "retryIssuance", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Post)('admin/requests/:id/dispatch'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "dispatch", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('COOP_ADMIN', 'TREMMA_SUPER_ADMIN'),
    (0, common_1.Post)('admin/requests/:id/delivered'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CardsController.prototype, "delivered", null);
exports.CardsController = CardsController = __decorate([
    (0, common_1.Controller)('cards'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cards_service_1.CardsService])
], CardsController);
//# sourceMappingURL=cards.controller.js.map