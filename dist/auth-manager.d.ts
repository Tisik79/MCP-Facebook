export interface PageToken {
    name: string;
    access_token: string;
    category?: string;
    tasks?: string[];
}
export interface AdAccountInfo {
    name: string;
    currency: string;
}
export interface ActiveSelection {
    pageId?: string;
    adAccountId?: string;
}
export interface TokenStore {
    _user?: {
        access_token: string;
        expires: number;
    };
    _ad_accounts?: Record<string, AdAccountInfo>;
    _active?: ActiveSelection;
    [pageId: string]: PageToken | any;
}
export declare function loadTokens(): TokenStore;
export declare function saveTokens(tokens: TokenStore): void;
export type AppCredsSource = 'config' | 'env' | 'builtin';
export declare function getAppCredentials(): {
    appId: string;
    appSecret: string;
    source: AppCredsSource;
};
/** Uloží vlastní App ID/Secret do fb-config.json (přepíše vestavěnou aplikaci). */
export declare function saveAppCredentials(appId: string, appSecret: string): void;
export declare function getToken(pageId?: string): string;
export declare function getActivePageId(): string | undefined;
export declare function getActivePage(): {
    id: string;
    name: string;
    access_token: string;
} | null;
export declare function getAdAccountId(): string;
export declare function listConnectedPages(): {
    id: string;
    name: string;
    category?: string;
    active: boolean;
}[];
export declare function listConnectedAdAccounts(): {
    id: string;
    name: string;
    currency: string;
    active: boolean;
}[];
/** Nastaví aktivní (výchozí) stránku a/nebo reklamní účet. Vrací aktuální stav. */
export declare function setActiveSelection(sel: ActiveSelection): {
    pageId?: string;
    adAccountId?: string;
};
/** (Re)inicializuje globální Facebook SDK aktuálním tokenem ze storu. */
export declare function reinitSdk(): boolean;
export declare function refreshUserTokenIfNeeded(appId: string, appSecret: string, refreshWithinMs?: number): Promise<boolean>;
export declare function setUserToken(appId: string, appSecret: string, providedToken: string): Promise<{
    pages: string[];
    adAccounts: string[];
    longLived: boolean;
}>;
export declare function getOAuthDialogUrl(appId: string): string;
export declare function getAuthLoginUrl(): string;
export declare function startAuthServer(appId: string, appSecret: string): void;
