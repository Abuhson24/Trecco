import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VtpassClient } from './vtpass.client';

const AIRTIME_SERVICE_IDS = ['mtn', 'glo', 'airtel', 'etisalat'];
const DATA_SERVICE_IDS = ['mtn-data', 'glo-data', 'airtel-data', 'etisalat-data'];

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vtpass: VtpassClient,
  ) {}

  // Data plans for a network — fetched fresh each time rather than cached,
  // since VTpass can change prices/availability. Frontend shows these as
  // options, then passes the chosen variation_code + amount to buyData().
  async getDataVariations(serviceId: string) {
    if (!DATA_SERVICE_IDS.includes(serviceId)) {
      throw new BadRequestException(`Unknown data service: ${serviceId}`);
    }
    return this.vtpass.get(`/service-variations?serviceID=${serviceId}`);
  }

  async buyAirtime(memberId: string, serviceId: string, phone: string, amount: number) {
    if (!AIRTIME_SERVICE_IDS.includes(serviceId)) {
      throw new BadRequestException(`Unknown airtime service: ${serviceId}`);
    }
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const personalAccount = await this.prisma.personalAccount.findUnique({ where: { memberId } });
    if (!personalAccount) throw new NotFoundException('No personal account for this member');
    if (Number(personalAccount.balance) < amount) {
      throw new BadRequestException('Insufficient personal account balance');
    }

    const requestId = this.vtpass.generateRequestId();

    const response = await this.vtpass.post<{
      code: string;
      response_description: string;
      content?: { transactions?: { status?: string } };
    }>('/pay', {
      request_id: requestId,
      serviceID: serviceId,
      amount,
      phone,
    });

    return this.recordPurchase(personalAccount.id, amount, requestId, 'AIRTIME_PURCHASE', response);
  }

  async buyData(memberId: string, serviceId: string, phone: string, variationCode: string, amount: number) {
    if (!DATA_SERVICE_IDS.includes(serviceId)) {
      throw new BadRequestException(`Unknown data service: ${serviceId}`);
    }
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const personalAccount = await this.prisma.personalAccount.findUnique({ where: { memberId } });
    if (!personalAccount) throw new NotFoundException('No personal account for this member');
    if (Number(personalAccount.balance) < amount) {
      throw new BadRequestException('Insufficient personal account balance');
    }

    const requestId = this.vtpass.generateRequestId();

    const response = await this.vtpass.post<{
      code: string;
      response_description: string;
      content?: { transactions?: { status?: string } };
    }>('/pay', {
      request_id: requestId,
      serviceID: serviceId,
      billersCode: phone,
      variation_code: variationCode,
      phone,
      amount,
    });

    return this.recordPurchase(personalAccount.id, amount, requestId, 'DATA_PURCHASE', response);
  }

  // Shared by both purchase types: VTpass accepting the request (code
  // '000' = delivered, anything else = pending/queued but still typically
  // committed on VTpass's side) means funds are debited here — same
  // "call external first, commit on success" pattern as withdraw(). A
  // later requery can update a PENDING transaction's status if needed.
  private async recordPurchase(
    personalAccountId: string,
    amount: number,
    requestId: string,
    type: 'AIRTIME_PURCHASE' | 'DATA_PURCHASE',
    response: { code: string; content?: { transactions?: { status?: string } } },
  ) {
    const status = response.code === '000' ? 'COMPLETED' : 'PENDING';

    await this.prisma.$transaction([
      this.prisma.personalAccount.update({
        where: { id: personalAccountId },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          type,
          status,
          amount,
          reference: requestId,
          method: 'vtpass',
          personalAccountId,
        },
      }),
    ]);

    return { status, requestId, vtpassCode: response.code };
  }

  async requeryTransaction(requestId: string) {
    return this.vtpass.post('/requery', { request_id: requestId });
  }
}
