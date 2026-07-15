import { PrismaService } from '../../prisma/prisma.service';
interface DemandDetails {
    cooperativeId?: string | null;
    productName: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    deadline?: string;
}
export declare class MarketplaceService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createDemandAsOfftaker(offtakerId: string, input: DemandDetails): Promise<{
        offtaker: {
            id: string;
            contactEmail: string;
            companyName: string;
            contactPhone: string;
            verified: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        cooperativeId: string | null;
        status: import(".prisma/client").$Enums.DemandStatus;
        productName: string;
        quantity: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        pricePerUnit: import("@prisma/client/runtime/library").Decimal;
        deadline: Date | null;
        offtakerId: string;
    }>;
    createDemandAsAdmin(input: DemandDetails & {
        offtakerId?: string;
        offtaker?: {
            companyName: string;
            contactEmail: string;
            contactPhone: string;
            passwordHash: string;
        };
    }): Promise<{
        offtaker: {
            id: string;
            contactEmail: string;
            companyName: string;
            contactPhone: string;
            verified: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        cooperativeId: string | null;
        status: import(".prisma/client").$Enums.DemandStatus;
        productName: string;
        quantity: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        pricePerUnit: import("@prisma/client/runtime/library").Decimal;
        deadline: Date | null;
        offtakerId: string;
    }>;
    private createDemand;
    listOpenDemands(cooperativeId: string): Promise<({
        offtaker: {
            id: string;
            contactEmail: string;
            companyName: string;
            contactPhone: string;
            verified: boolean;
        };
        offers: {
            id: string;
            memberId: string;
            status: import(".prisma/client").$Enums.OfferStatus;
            quantityOffered: import("@prisma/client/runtime/library").Decimal;
            submittedAt: Date;
            demandId: string;
            inventoryItemId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        cooperativeId: string | null;
        status: import(".prisma/client").$Enums.DemandStatus;
        productName: string;
        quantity: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        pricePerUnit: import("@prisma/client/runtime/library").Decimal;
        deadline: Date | null;
        offtakerId: string;
    })[]>;
    submitOffer(memberId: string, demandId: string, input: {
        quantityOffered: number;
        inventoryItemId?: string;
    }): Promise<{
        id: string;
        memberId: string;
        status: import(".prisma/client").$Enums.OfferStatus;
        quantityOffered: import("@prisma/client/runtime/library").Decimal;
        submittedAt: Date;
        demandId: string;
        inventoryItemId: string | null;
    }>;
    listOffers(demandId: string): Promise<({
        member: {
            id: string;
            phone: string;
            fullName: string;
        };
        inventoryItem: {
            id: string;
            name: string;
            createdAt: Date;
            cooperativeId: string;
            memberId: string;
            status: import(".prisma/client").$Enums.InventoryStatus;
            quantity: import("@prisma/client/runtime/library").Decimal;
            unit: string;
            category: import(".prisma/client").$Enums.InventoryCategory;
            estimatedValue: import("@prisma/client/runtime/library").Decimal | null;
        } | null;
    } & {
        id: string;
        memberId: string;
        status: import(".prisma/client").$Enums.OfferStatus;
        quantityOffered: import("@prisma/client/runtime/library").Decimal;
        submittedAt: Date;
        demandId: string;
        inventoryItemId: string | null;
    })[]>;
    acceptOffer(offerId: string): Promise<{
        id: string;
        memberId: string;
        status: import(".prisma/client").$Enums.OfferStatus;
        quantityOffered: import("@prisma/client/runtime/library").Decimal;
        submittedAt: Date;
        demandId: string;
        inventoryItemId: string | null;
    } | null>;
    declineOffer(offerId: string): Promise<{
        id: string;
        memberId: string;
        status: import(".prisma/client").$Enums.OfferStatus;
        quantityOffered: import("@prisma/client/runtime/library").Decimal;
        submittedAt: Date;
        demandId: string;
        inventoryItemId: string | null;
    }>;
}
export {};
