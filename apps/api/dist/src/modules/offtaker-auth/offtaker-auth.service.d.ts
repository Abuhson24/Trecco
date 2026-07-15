import { PrismaService } from '../../prisma/prisma.service';
interface SignupInput {
    companyName: string;
    contactEmail: string;
    contactPhone: string;
    password: string;
}
interface LoginInput {
    contactEmail: string;
    password: string;
}
export declare class OfftakerAuthService {
    private readonly prisma;
    private readonly tokens;
    constructor(prisma: PrismaService);
    signup(input: SignupInput): Promise<{
        accessToken: string;
        offtaker: {
            id: string;
            companyName: string;
            contactEmail: string;
            contactPhone: string;
            verified: boolean;
        };
    }>;
    login(input: LoginInput): Promise<{
        accessToken: string;
        offtaker: {
            id: string;
            companyName: string;
            contactEmail: string;
            contactPhone: string;
            verified: boolean;
        };
    }>;
    verifyToken(token: string): Promise<{
        sub: string;
    }>;
    private issueToken;
}
export {};
