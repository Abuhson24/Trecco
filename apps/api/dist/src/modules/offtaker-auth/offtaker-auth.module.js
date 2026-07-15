"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfftakerAuthModule = void 0;
const common_1 = require("@nestjs/common");
const offtaker_auth_controller_1 = require("./offtaker-auth.controller");
const offtaker_auth_service_1 = require("./offtaker-auth.service");
const offtaker_auth_guard_1 = require("./offtaker-auth.guard");
let OfftakerAuthModule = class OfftakerAuthModule {
};
exports.OfftakerAuthModule = OfftakerAuthModule;
exports.OfftakerAuthModule = OfftakerAuthModule = __decorate([
    (0, common_1.Module)({
        controllers: [offtaker_auth_controller_1.OfftakerAuthController],
        providers: [offtaker_auth_service_1.OfftakerAuthService, offtaker_auth_guard_1.OfftakerAuthGuard],
        exports: [offtaker_auth_service_1.OfftakerAuthService, offtaker_auth_guard_1.OfftakerAuthGuard],
    })
], OfftakerAuthModule);
//# sourceMappingURL=offtaker-auth.module.js.map