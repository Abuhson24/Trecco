import { Module } from "@nestjs/common";
import { CooperativeController } from "./cooperative.controller";
import { CooperativeService } from "./cooperative.service";

@Module({
  controllers: [CooperativeController],
  providers: [CooperativeService],
  exports: [CooperativeService],
})
export class CooperativeModule {}
