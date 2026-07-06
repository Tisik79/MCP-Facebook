// Sdílené helpery pro přímá volání Graph API (v25.0) s explicitním tokenem.
// Chyby se vyhazují v surové podobě ({ error: {...} }) – formatFbError je umí přečíst.
import { getActiveToken, getActiveAccountId } from '../config.js';

export const GRAPH_VERSION = process.env.FB_GRAPH_API_VERSION || 'v25.0';

export const requireToken = (): string => {
  const t = getActiveToken();
  if (!t) throw new Error('Chybí access token (přihlas se k Facebooku: „Připoj Facebook účet").');
  return t;
};

export const requireActId = (): string => {
  const id = getActiveAccountId();
  if (!id) throw new Error('Není k dispozici reklamní účet. V Claude řekni: „Připoj Facebook účet".');
  return id.startsWith('act_') ? id : `act_${id}`;
};

const parse = async (res: Response) => {
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw (data?.error ? data : new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`));
  return data;
};

export const graphGet = async (path: string, params: Record<string, string> = {}): Promise<any> => {
  const qs = new URLSearchParams({ ...params, access_token: requireToken() });
  return parse(await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}?${qs}`));
};

export const graphPost = async (path: string, params: Record<string, string> = {}): Promise<any> => {
  const body = new URLSearchParams({ ...params, access_token: requireToken() });
  return parse(await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, { method: 'POST', body }));
};

export const graphDelete = async (path: string, params: Record<string, string> = {}): Promise<any> => {
  const qs = new URLSearchParams({ ...params, access_token: requireToken() });
  return parse(await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}?${qs}`, { method: 'DELETE' }));
};

// Objektové parametry můžou od klienta přijít jako JSON string – sjednocení na objekt.
export const parseIfString = (v: any, label: string): any => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); }
  catch { throw new Error(`Parametr ${label} přišel jako neplatný JSON string.`); }
};
