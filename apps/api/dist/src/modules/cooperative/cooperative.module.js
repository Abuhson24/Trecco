"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CooperativeModule = void 0;
const common_1 = require("@nestjs/common");
const cooperative_controller_1 = require("./cooperative.controller");
const cooperative_service_1 = require("./cooperative.service");
let CooperativeModule = class CooperativeModule {
};
exports.CooperativeModule = CooperativeModule;
exports.CooperativeModule = CooperativeModule = __decorate([
    (0, common_1.Module)({
        controllers: [cooperative_controller_1.CooperativeController],
        providers: [cooperative_service_1.CooperativeService],
        exports: [cooperative_service_1.CooperativeService],
    })
], CooperativeModule);
//# sourceMappingURL=cooperative.module.js.map