import { AdAccount } from 'facebook-nodejs-business-sdk';
export declare const config: {
    readonly facebookAppId: string;
    readonly facebookAppSecret: string;
    readonly facebookAccessToken: string | undefined;
    readonly facebookAccountId: string | undefined;
    readonly dsaBeneficiary: string | undefined;
    readonly dsaPayor: string | undefined;
    port: number;
};
export declare const validateConfig: () => boolean;
/**
 * (Re)inicializuje globální Facebook SDK. Vrací `false`, pokud zatím není token –
 * v takovém případě server stejně nastartuje a uživatel se může přihlásit za běhu.
 */
export declare const initFacebookSdk: (pageId?: string) => boolean;
export declare const getActiveToken: (pageId?: string) => string;
export declare const getActiveAccountId: () => string;
export declare const getAdAccount: () => AdAccount;
