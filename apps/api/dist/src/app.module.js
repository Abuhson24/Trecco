"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const cooperative_module_1 = require("./modules/cooperative/cooperative.module");
const loans_module_1 = require("./modules/loans/loans.module");
const marketplace_module_1 = require("./modules/marketplace/marketplace.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const cards_module_1 = require("./modules/cards/cards.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            wallet_module_1.WalletModule,
            cooperative_module_1.CooperativeModule,
            loans_module_1.LoansModule,
            marketplace_module_1.MarketplaceModule,
            inventory_module_1.InventoryModule,
            notifications_module_1.NotificationsModule,
            cards_module_1.CardsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map