import { OfftakerAuthService } from './offtaker-auth.service';
export declare class OfftakerAuthController {
    private readonly offtakerAuth;
    constructor(offtakerAuth: OfftakerAuthService);
    signup(body: {
        companyName: string;
        contactEmail: string;
        contactPhone: string;
        password: string;
    }): Promise<{
        accessToken: string;
        offtaker: {
            id: string;
            companyName: string;
            contactEmail: string;
            contactPhone: string;
            verified: boolean;
        };
    }>;
    login(body: {
        contactEmail: string;
        password: string;
    }): Promise<{
        accessToken: string;
        offtaker: {
            id: string;
            companyName: string;
            contactEmail: string;
            contactPhone: string;
            verified: boolean;
        };
    }>;
}
