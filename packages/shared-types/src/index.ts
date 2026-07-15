// Shared across apps/web and apps/mobile so both clients agree on API shapes.
// Keep in sync with apps/api/prisma/schema.prisma — this is a hand-maintained
// mirror for now; consider generating it from Prisma once the schema stabilizes.

export type Role = 'MEMBER' | 'COOP_ADMIN' | 'TREMMA_SUPER_ADMIN';

export type Language =
  | 'ENGLISH' | 'HAUSA' | 'YORUBA' | 'IGBO' | 'PIDGIN'
  | 'KISWAHILI' | 'FRENCH' | 'PORTUGUESE' | 'AMHARIC' | 'ARABIC';

export interface Member {
  id: string;
  cooperativeId: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: Language;
}

export interface WalletBalance {
  personalBalance: number;
  cooperativeSavings: number;
  providusAccountNumber: string;
}

export type LoanStatus =
  | 'SUBMITTED' | 'COMMITTEE_VOTING' | 'ADMIN_APPROVAL'
  | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'REPAYING' | 'CLOSED';

export interface Loan {
  id: string;
  amountRequested: number;
  amountApproved: number | null;
  amountRepaid: number;
  interestRate: number;
  purpose: string;
  repaymentMonths: number;
  status: LoanStatus;
  votes: { voterId: string; approve: boolean }[];
}

export type InventoryCategory = 'SEEDS' | 'FERTILIZER' | 'EQUIPMENT' | 'PRODUCE' | 'OTHER';
export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: string;
  memberId: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  status: InventoryStatus;
}

export type CardType = 'VIRTUAL' | 'PHYSICAL';

export type CardRequestStatus =
  | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'FEE_DEDUCTED'
  | 'ISSUING' | 'ISSUED' | 'DISPATCHED' | 'DELIVERED'
  | 'REJECTED' | 'FAILED' | 'CANCELLED';

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
}

export interface CardRequest {
  id: string;
  memberId: string;
  cardType: CardType;
  status: CardRequestStatus;
  deliveryFullName: string | null;
  deliveryPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  feeAmount: number | null;
  rejectionReason: string | null;
  courier: string | null;
  trackingReference: string | null;
  submittedAt: string;
  dispatchedAt: string | null;
  deliveredAt: string | null;
}

export type CardStatus = 'ACTIVE' | 'BLOCKED' | 'EXPIRED';

export interface Card {
  id: string;
  memberId: string;
  cardRequestId: string;
  cardType: CardType;
  maskedPan: string;
  expiryMonth: number;
  expiryYear: number;
  status: CardStatus;
}

export type DemandStatus = 'OPEN' | 'MATCHED' | 'CLOSED' | 'EXPIRED';

export interface MarketplaceDemand {
  id: string;
  offtakerId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  deadline: string | null;
  status: DemandStatus;
}
