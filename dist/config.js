"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.getAdAccount = exports.getActiveAccountId = exports.getActiveToken = exports.initFacebookSdk = exports.validateConfig = void 0;
const facebook_nodejs_business_sdk_1 = require("facebook-nodejs-business-sdk");
const auth_manager_js_1 = require("./auth-manager.js");
const setup_js_1 = require("./setup.js");
const validateConfig = () => {
    const cfg = (0, setup_js_1.loadConfig)();
    if (!cfg)
        return false;
    const tokens = (0, auth_manager_js_1.loadTokens)();
    return Object.keys(tokens).filter(k => !k.startsWith('_')).length > 0 || !!tokens._user;
};
exports.validateConfig = validateConfig;
const initFacebookSdk = (pageId) => {
    let token;
    try {
        token = (0, auth_manager_js_1.getToken)(pageId);
    }
    catch {
        token = process.env.FACEBOOK_ACCESS_TOKEN || '';
    }
    if (!token)
        throw new Error('Nejsi přihlášen. Spusť: npx facebook-ads-mcp login');
    facebook_nodejs_business_sdk_1.FacebookAdsApi.init(token);
};
exports.initFacebookSdk = initFacebookSdk;
const getActiveToken = (pageId) => {
    try {
        return (0, auth_manager_js_1.getToken)(pageId);
    }
    catch {
        return process.env.FACEBOOK_ACCESS_TOKEN || '';
    }
};
exports.getActiveToken = getActiveToken;
const getActiveAccountId = () => {
    const fromManager = (0, auth_manager_js_1.getAdAccountId)();
    return fromManager || process.env.FACEBOOK_ACCOUNT_ID || '';
};
exports.getActiveAccountId = getActiveAccountId;
const getAdAccount = () => {
    const accountId = (0, exports.getActiveAccountId)();
    if (!accountId)
        throw new Error('Žádný reklamní účet nenalezen. Přihlas se přes: npx facebook-ads-mcp login');
    return new facebook_nodejs_business_sdk_1.AdAccount(accountId);
};
exports.getAdAccount = getAdAccount;
exports.config = {
    facebookAppId: (0, setup_js_1.loadConfig)()?.appId || process.env.FACEBOOK_APP_ID,
    facebookAppSecret: (0, setup_js_1.loadConfig)()?.appSecret || process.env.FACEBOOK_APP_SECRET,
    facebookAccessToken: process.env.FACEBOOK_ACCESS_TOKEN,
    facebookAccountId: process.env.FACEBOOK_ACCOUNT_ID,
    port: 3000,
};
//# sourceMappingURL=config.js.map