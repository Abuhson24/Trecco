import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    signup(body: {
        fullName: string;
        email: string;
        phone: string;
        password: string;
        cooperativeId: string;
    }): Promise<import("./auth.service").TokenPair & {
        member: import("./auth.service").PublicMember;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<import("./auth.service").TokenPair & {
        member: import("./auth.service").PublicMember;
    }>;
    refresh(body: {
        refreshToken: string;
    }): Promise<import("./auth.service").TokenPair>;
    me(req: any): Promise<import("./auth.service").PublicMember>;
}
