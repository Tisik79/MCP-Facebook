import { FacebookAdsApi, AdAccount } from 'facebook-nodejs-business-sdk';
import { loadTokens, getToken, getAdAccountId } from './auth-manager.js';
import { loadConfig } from './setup.js';

export const validateConfig = (): boolean => {
  const cfg = loadConfig();
  if (!cfg) return false;
  const tokens = loadTokens();
  return Object.keys(tokens).filter(k => !k.startsWith('_')).length > 0 || !!tokens._user;
};

export const initFacebookSdk = (pageId?: string) => {
  let token: string;
  try { token = getToken(pageId); }
  catch { token = process.env.FACEBOOK_ACCESS_TOKEN || ''; }
  if (!token) throw new Error('Nejsi přihlášen. Spusť: npx facebook-ads-mcp login');
  FacebookAdsApi.init(token);
};

export const getActiveToken = (pageId?: string): string => {
  try { return getToken(pageId); }
  catch { return process.env.FACEBOOK_ACCESS_TOKEN || ''; }
};

export const getActiveAccountId = (): string => {
  const fromManager = getAdAccountId();
  return fromManager || process.env.FACEBOOK_ACCOUNT_ID || '';
};

export const getAdAccount = (): AdAccount => {
  const accountId = getActiveAccountId();
  if (!accountId) throw new Error('Žádný reklamní účet nenalezen. Přihlas se přes: npx facebook-ads-mcp login');
  return new AdAccount(accountId);
};

export const config = {
  facebookAppId: loadConfig()?.appId || process.env.FACEBOOK_APP_ID,
  facebookAppSecret: loadConfig()?.appSecret || process.env.FACEBOOK_APP_SECRET,
  facebookAccessToken: process.env.FACEBOOK_ACCESS_TOKEN,
  facebookAccountId: process.env.FACEBOOK_ACCOUNT_ID,
  port: 3000,
};
