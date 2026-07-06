// Konverzní vrstva: Conversions API (server-side eventy), vlastní konverze
// a offline konverze. PII pole (email, telefon, jméno…) se automaticky
// normalizují (trim+lowercase) a hashují SHA-256, pokud už hashovaná nejsou.
import crypto from 'crypto';
import { graphGet, graphPost, graphDelete, requireActId, parseIfString } from './fb-graph.js';
import { formatFbError } from './fb-error.js';

const SHA256_RE = /^[a-f0-9]{64}$/i;
const sha256 = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');
// Pole user_data / match_keys, která Meta vyžaduje hashovaná
const PII_KEYS = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'ge', 'db', 'external_id', 'email', 'phone', 'madid'];

const hashPii = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  const out: any = { ...obj };
  for (const key of PII_KEYS) {
    if (out[key] == null) continue;
    const hashOne = (v: any) => (typeof v === 'string' && v && !SHA256_RE.test(v)) ? sha256(v) : v;
    out[key] = Array.isArray(out[key]) ? out[key].map(hashOne) : hashOne(out[key]);
  }
  return out;
};

// --- Conversions API (CAPI) --------------------------------------------------

// Jeden server-side event na /{pixel_id}/events. event_id slouží k deduplikaci s browser pixelem.
export const sendConversionEvent = async (args: {
  pixelId: string; eventName: string; eventTime?: number; eventId?: string;
  userData: any; customData?: any; eventSourceUrl?: string; actionSource?: string; testEventCode?: string;
}) => {
  try {
    if (!args.pixelId || !args.eventName) throw new Error('Chybí pixel_id nebo event_name.');
    const userData = hashPii(parseIfString(args.userData, 'user_data'));
    if (!userData || Object.keys(userData).length === 0) {
      throw new Error('Chybí user_data (aspoň jeden identifikátor: em, ph, client_ip_address+client_user_agent, fbp/fbc…).');
    }
    const event: any = {
      event_name: args.eventName,
      event_time: args.eventTime ?? Math.floor(Date.now() / 1000),
      action_source: args.actionSource || 'website',
      user_data: userData,
      ...(args.eventId && { event_id: args.eventId }),
      ...(args.eventSourceUrl && { event_source_url: args.eventSourceUrl }),
      ...(args.customData && { custom_data: parseIfString(args.customData, 'custom_data') }),
    };
    const params: Record<string, string> = { data: JSON.stringify([event]) };
    if (args.testEventCode) params.test_event_code = args.testEventCode;
    const d = await graphPost(`${args.pixelId}/events`, params);
    return {
      success: true, eventsReceived: d.events_received ?? null, fbtraceId: d.fbtrace_id ?? null,
      message: `Event "${args.eventName}" odeslán na pixel ${args.pixelId} (events_received: ${d.events_received ?? '?'}`
        + `${args.testEventCode ? `, TEST režim: ${args.testEventCode}` : ''}).`,
    };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při odeslání CAPI eventu') }; }
};

// Dávka eventů (pole event objektů dle CAPI schématu; user_data se hashuje automaticky)
export const sendConversionEventsBatch = async (pixelId: string, events: any, testEventCode?: string) => {
  try {
    if (!pixelId) throw new Error('Chybí pixel_id.');
    const list = parseIfString(events, 'events');
    if (!Array.isArray(list) || list.length === 0) throw new Error('events musí být neprázdné pole.');
    const prepared = list.map((ev: any) => ({
      ...ev,
      event_time: ev.event_time ?? Math.floor(Date.now() / 1000),
      action_source: ev.action_source || 'website',
      user_data: hashPii(ev.user_data),
    }));
    const params: Record<string, string> = { data: JSON.stringify(prepared) };
    if (testEventCode) params.test_event_code = testEventCode;
    const d = await graphPost(`${pixelId}/events`, params);
    return {
      success: true, eventsReceived: d.events_received ?? null,
      message: `Odesláno ${list.length} eventů na pixel ${pixelId} (events_received: ${d.events_received ?? '?'}).`,
    };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při odeslání CAPI dávky') }; }
};

// --- Vlastní konverze (custom conversions) -----------------------------------

const CC_FIELDS = 'id,name,custom_event_type,rule,creation_time,is_archived,default_conversion_value,pixel{id,name}';

export const listCustomConversions = async () => {
  try {
    const act = requireActId();
    const d = await graphGet(`${act}/customconversions`, { fields: CC_FIELDS, limit: '100' });
    const items = (d.data || []).map((c: any) => ({
      id: c.id, name: c.name, eventType: c.custom_event_type || null,
      rule: c.rule || null, pixelId: c.pixel?.id || null, archived: c.is_archived ?? false,
    }));
    return { success: true, items, message: `Nalezeno ${items.length} vlastních konverzí.` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při výpisu vlastních konverzí') }; }
};

export const getCustomConversion = async (id: string) => {
  try {
    if (!id) throw new Error('Chybí id konverze.');
    const c = await graphGet(id, { fields: CC_FIELDS });
    return {
      success: true,
      conversion: {
        id: c.id, name: c.name, eventType: c.custom_event_type || null, rule: c.rule || null,
        pixelId: c.pixel?.id || null, archived: c.is_archived ?? false,
        defaultValue: c.default_conversion_value ?? null, creationTime: c.creation_time || null,
      },
      message: `Konverze ${c.id} ("${c.name}") – event: ${c.custom_event_type || 'rule-based'}, pixel: ${c.pixel?.id || '—'}.`,
    };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při čtení vlastní konverze') }; }
};

// custom_event_type (např. LEAD) NEBO rule (JSON, např. URL obsahuje /dekujeme)
export const createCustomConversion = async (args: {
  name: string; pixelId: string; customEventType?: string; rule?: any; defaultConversionValue?: number;
}) => {
  try {
    if (!args.name || !args.pixelId) throw new Error('Chybí name nebo pixel_id.');
    if (!args.customEventType && !args.rule) {
      throw new Error('Zadej custom_event_type (např. "LEAD") nebo rule (JSON pravidlo, např. {"and":[{"event":{"eq":"PageView"}},{"URL":{"i_contains":"/dekujeme"}}]}).');
    }
    const act = requireActId();
    const params: Record<string, string> = { name: args.name, event_source_id: args.pixelId };
    if (args.customEventType) params.custom_event_type = args.customEventType;
    if (args.rule) params.rule = JSON.stringify(parseIfString(args.rule, 'rule'));
    if (args.defaultConversionValue != null) params.default_conversion_value = String(args.defaultConversionValue);
    const d = await graphPost(`${act}/customconversions`, params);
    return { success: true, conversionId: d.id, message: `Vlastní konverze "${args.name}" vytvořena. ID: ${d.id} (použitelné jako custom_conversion_id v promoted_object).` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při vytváření vlastní konverze') }; }
};

export const updateCustomConversion = async (id: string, updates: { name?: string; defaultConversionValue?: number }) => {
  try {
    if (!id) throw new Error('Chybí id konverze.');
    const params: Record<string, string> = {};
    if (updates.name) params.name = updates.name;
    if (updates.defaultConversionValue != null) params.default_conversion_value = String(updates.defaultConversionValue);
    if (!Object.keys(params).length) throw new Error('Nebyly zadány žádné změny (name / default_conversion_value).');
    await graphPost(id, params);
    // Read-after-write
    const v = await graphGet(id, { fields: 'id,name,default_conversion_value' });
    if (updates.name && v.name !== updates.name) {
      return { success: false, message: `Úprava konverze se nepropsala (název je "${v.name}").` };
    }
    return { success: true, message: `Konverze ${id} upravena. Název: "${v.name}", výchozí hodnota: ${v.default_conversion_value ?? '—'}.` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při úpravě vlastní konverze') }; }
};

export const deleteCustomConversion = async (id: string) => {
  try {
    if (!id) throw new Error('Chybí id konverze.');
    await graphDelete(id);
    return { success: true, message: `Vlastní konverze ${id} smazána.` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při mazání vlastní konverze') }; }
};

// --- Offline konverze ---------------------------------------------------------

export const listOfflineConversionSets = async () => {
  try {
    const act = requireActId();
    const d = await graphGet(`${act}/offline_conversion_data_sets`, {
      fields: 'id,name,description,event_stats,last_upload_app,valid_entries,matched_entries', limit: '50',
    });
    const items = (d.data || []).map((s: any) => ({
      id: s.id, name: s.name, description: s.description || '',
      validEntries: s.valid_entries ?? null, matchedEntries: s.matched_entries ?? null,
    }));
    return { success: true, items, message: `Nalezeno ${items.length} offline event setů.` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při výpisu offline event setů') }; }
};

// Vytvoření vyžaduje Business ID (bere se z env FACEBOOK_BUSINESS_ID, jde přepsat parametrem)
export const createOfflineConversionSet = async (name: string, description?: string, businessId?: string) => {
  try {
    if (!name) throw new Error('Chybí name.');
    const biz = businessId || process.env.FACEBOOK_BUSINESS_ID;
    if (!biz) throw new Error('Chybí business_id (parametr business_id nebo env FACEBOOK_BUSINESS_ID).');
    const d = await graphPost(`${biz}/offline_conversion_data_sets`, {
      name, ...(description && { description }),
    });
    return { success: true, setId: d.id, message: `Offline event set "${name}" vytvořen. ID: ${d.id}` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při vytváření offline event setu') }; }
};

// Upload offline konverzí: data = pole {match_keys:{em/ph/...}, event_time, event_name, value?, currency?}
export const uploadOfflineConversions = async (setId: string, uploadTag: string, data: any) => {
  try {
    if (!setId || !uploadTag) throw new Error('Chybí set_id nebo upload_tag.');
    const list = parseIfString(data, 'data');
    if (!Array.isArray(list) || list.length === 0) throw new Error('data musí být neprázdné pole eventů.');
    const prepared = list.map((ev: any) => ({ ...ev, match_keys: hashPii(ev.match_keys) }));
    const d = await graphPost(`${setId}/events`, { upload_tag: uploadTag, data: JSON.stringify(prepared) });
    return {
      success: true, apiCallsMade: d.num_processed_entries ?? null,
      message: `Nahráno ${list.length} offline konverzí do setu ${setId} (tag: ${uploadTag}).`,
    };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při uploadu offline konverzí') }; }
};
