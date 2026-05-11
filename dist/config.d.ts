import { AdAccount } from 'facebook-nodejs-business-sdk';
export declare const validateConfig: () => boolean;
export declare const initFacebookSdk: (pageId?: string) => void;
export declare const getActiveToken: (pageId?: string) => string;
export declare const getActiveAccountId: () => string;
export declare const getAdAccount: () => AdAccount;
export declare const config: {
    facebookAppId: string | undefined;
    facebookAppSecret: string | undefined;
    facebookAccessToken: string | undefined;
    facebookAccountId: string | undefined;
    port: number;
};
