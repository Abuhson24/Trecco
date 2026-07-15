import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
interface SignupInput {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    cooperativeId: string;
}
interface LoginInput {
    email: string;
    password: string;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export interface PublicMember {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    cooperativeId: string;
}
export declare class AuthService {
    private readonly prisma;
    private readonly wallet;
    private readonly logger;
    private readonly accessTokens;
    private readonly refreshTokens;
    constructor(prisma: PrismaService, wallet: WalletService);
    signup(input: SignupInput): Promise<TokenPair & {
        member: PublicMember;
    }>;
    login(input: LoginInput): Promise<TokenPair & {
        member: PublicMember;
    }>;
    refresh(refreshToken: string): Promise<TokenPair>;
    me(memberId: string): Promise<PublicMember>;
    verifyAccessToken(token: string): Promise<{
        sub: string;
        role: string;
        cooperativeId: string;
    }>;
    private issueTokens;
}
export {};
