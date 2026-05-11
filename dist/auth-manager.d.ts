export interface PageToken {
    name: string;
    access_token: string;
    category?: string;
    tasks?: string[];
}
export interface TokenStore {
    _user?: {
        access_token: string;
        expires: number;
    };
    _ad_accounts?: Record<string, {
        name: string;
        currency: string;
    }>;
    [pageId: string]: PageToken | any;
}
export declare function loadTokens(): TokenStore;
export declare function saveTokens(tokens: TokenStore): void;
export declare function getToken(pageId?: string): string;
export declare function getAdAccountId(): string;
export declare function listConnectedPages(): {
    id: string;
    name: string;
    category?: string;
}[];
export declare function startAuthServer(appId: string, appSecret: string): void;
