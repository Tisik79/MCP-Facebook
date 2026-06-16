"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdAccount = exports.getActiveAccountId = exports.getActiveToken = exports.initFacebookSdk = exports.validateConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const facebook_nodejs_business_sdk_1 = require("facebook-nodejs-business-sdk");
const auth_manager_js_1 = require("./auth-manager.js");
// Cowork spouští server s cwd=/, takže výchozí dotenv.config() (čte ./.env) nikdy nenajde
// náš .env. Načteme ho absolutní cestou odvozenou od umístění modulu: dist/config.js → ../.env.
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '.env') });
// Vrátí aktuální access token: nejprve z uloženého OAuth přihlášení (tokens.json),
// jako fallback z env proměnné. Nikdy nevyhazuje výjimku (vrací prázdný řetězec).
function resolveToken(pageId) {
    try {
        return (0, auth_manager_js_1.getToken)(pageId);
    }
    catch {
        return process.env.FACEBOOK_ACCESS_TOKEN || '';
    }
}
// `config` je proxy přes aktuální stav přihlášení – jakmile se uživatel přihlásí
// (přes nástroj connect_facebook_account / OAuth), všechny tyto hodnoty se samy
// "doplní" bez nutnosti restartu MCP serveru.
exports.config = {
    get facebookAppId() { return (0, auth_manager_js_1.getAppCredentials)().appId; },
    get facebookAppSecret() { return (0, auth_manager_js_1.getAppCredentials)().appSecret; },
    get facebookAccessToken() { return resolveToken() || undefined; },
    get facebookAccountId() { return (0, auth_manager_js_1.getAdAccountId)() || undefined; },
    // EU DSA transparentnost – výchozí inzerent pro ad sety cílené na EU. Čte se z .env
    // (FB_DSA_BENEFICIARY / FB_DSA_PAYOR), takže hodnota projde i bez nového tool-paramu,
    // dokud Cowork neobnoví zamrzlé schéma nástrojů. Explicitní param na ad setu má přednost.
    get dsaBeneficiary() { return process.env.FB_DSA_BENEFICIARY || undefined; },
    get dsaPayor() { return process.env.FB_DSA_PAYOR || undefined; },
    port: 3000,
};
// Server smí nastartovat i bez tokenu – jen API operace zatím nepůjdou,
// dokud se uživatel nepřihlásí. App credentials jsou vždy k dispozici
// (vestavěná sdílená aplikace), takže validace neselže kvůli nim.
const validateConfig = () => {
    const tokens = (0, auth_manager_js_1.loadTokens)();
    const hasStored = !!tokens._user?.access_token
        || Object.keys(tokens).some(k => !k.startsWith('_') && tokens[k]?.access_token);
    if (hasStored)
        return true;
    return !!(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_ACCOUNT_ID);
};
exports.validateConfig = validateConfig;
/**
 * (Re)inicializuje globální Facebook SDK. Vrací `false`, pokud zatím není token –
 * v takovém případě server stejně nastartuje a uživatel se může přihlásit za běhu.
 */
const initFacebookSdk = (pageId) => {
    const token = resolveToken(pageId);
    if (!token)
        return false;
    facebook_nodejs_business_sdk_1.FacebookAdsApi.init(token);
    return true;
};
exports.initFacebookSdk = initFacebookSdk;
const getActiveToken = (pageId) => resolveToken(pageId);
exports.getActiveToken = getActiveToken;
const getActiveAccountId = () => (0, auth_manager_js_1.getAdAccountId)() || '';
exports.getActiveAccountId = getActiveAccountId;
const getAdAccount = () => {
    const id = (0, exports.getActiveAccountId)();
    if (!id)
        throw new Error('Žádný reklamní účet není k dispozici. V Claude řekni: „Připoj Facebook účet".');
    return new facebook_nodejs_business_sdk_1.AdAccount(id);
};
exports.getAdAccount = getAdAccount;
//# sourceMappingURL=config.js.map