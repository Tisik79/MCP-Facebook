import dotenv from 'dotenv';
import path from 'path';
import { FacebookAdsApi, AdAccount } from 'facebook-nodejs-business-sdk';
import { loadTokens, getToken, getAdAccountId, getAppCredentials } from './auth-manager.js';

// Cowork spouští server s cwd=/, takže výchozí dotenv.config() (čte ./.env) nikdy nenajde
// náš .env. Načteme ho absolutní cestou odvozenou od umístění modulu: dist/config.js → ../.env.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Vrátí aktuální access token: nejprve z uloženého OAuth přihlášení (tokens.json),
// jako fallback z env proměnné. Nikdy nevyhazuje výjimku (vrací prázdný řetězec).
function resolveToken(pageId?: string): string {
  try { return getToken(pageId); }
  catch { return process.env.FACEBOOK_ACCESS_TOKEN || ''; }
}

// `config` je proxy přes aktuální stav přihlášení – jakmile se uživatel přihlásí
// (přes nástroj connect_facebook_account / OAuth), všechny tyto hodnoty se samy
// "doplní" bez nutnosti restartu MCP serveru.
export const config = {
  get facebookAppId(): string { return getAppCredentials().appId; },
  get facebookAppSecret(): string { return getAppCredentials().appSecret; },
  get facebookAccessToken(): string | undefined { return resolveToken() || undefined; },
  get facebookAccountId(): string | undefined { return getAdAccountId() || undefined; },
  // EU DSA transparentnost – výchozí inzerent pro ad sety cílené na EU. Čte se z .env
  // (FB_DSA_BENEFICIARY / FB_DSA_PAYOR), takže hodnota projde i bez nového tool-paramu,
  // dokud Cowork neobnoví zamrzlé schéma nástrojů. Explicitní param na ad setu má přednost.
  get dsaBeneficiary(): string | undefined { return process.env.FB_DSA_BENEFICIARY || undefined; },
  get dsaPayor(): string | undefined { return process.env.FB_DSA_PAYOR || undefined; },
  port: 3000,
};

// Server smí nastartovat i bez tokenu – jen API operace zatím nepůjdou,
// dokud se uživatel nepřihlásí. App credentials jsou vždy k dispozici
// (vestavěná sdílená aplikace), takže validace neselže kvůli nim.
export const validateConfig = (): boolean => {
  const tokens = loadTokens();
  const hasStored = !!tokens._user?.access_token
    || Object.keys(tokens).some(k => !k.startsWith('_') && (tokens[k] as any)?.access_token);
  if (hasStored) return true;
  return !!(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_ACCOUNT_ID);
};

/**
 * (Re)inicializuje globální Facebook SDK. Vrací `false`, pokud zatím není token –
 * v takovém případě server stejně nastartuje a uživatel se může přihlásit za běhu.
 */
export const initFacebookSdk = (pageId?: string): boolean => {
  const token = resolveToken(pageId);
  if (!token) return false;
  FacebookAdsApi.init(token);
  return true;
};

export const getActiveToken = (pageId?: string): string => resolveToken(pageId);

export const getActiveAccountId = (): string => getAdAccountId() || '';

export const getAdAccount = (): AdAccount => {
  const id = getActiveAccountId();
  if (!id) throw new Error('Žádný reklamní účet není k dispozici. V Claude řekni: „Připoj Facebook účet".');
  return new AdAccount(id);
};
