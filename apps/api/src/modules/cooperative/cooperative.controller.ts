import { Controller } from "@nestjs/common";
import { CooperativeService } from "./cooperative.service";

@Controller("cooperative")
export class CooperativeController {
  constructor(private readonly cooperative: CooperativeService) {}
}
