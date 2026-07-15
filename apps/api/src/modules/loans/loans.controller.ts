import { Controller } from "@nestjs/common";
import { LoansService } from "./loans.service";

@Controller("loans")
export class LoansController {
  constructor(private readonly loans: LoansService) {}
}
