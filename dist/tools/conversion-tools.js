"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadOfflineConversions = exports.createOfflineConversionSet = exports.listOfflineConversionSets = exports.deleteCustomConversion = exports.updateCustomConversion = exports.createCustomConversion = exports.getCustomConversion = exports.listCustomConversions = exports.sendConversionEventsBatch = exports.sendConversionEvent = void 0;
// Konverzní vrstva: Conversions API (server-side eventy), vlastní konverze
// a offline konverze. PII pole (email, telefon, jméno…) se automaticky
// normalizují (trim+lowercase) a hashují SHA-256, pokud už hashovaná nejsou.
const crypto_1 = __importDefault(require("crypto"));
const fb_graph_js_1 = require("./fb-graph.js");
const fb_error_js_1 = require("./fb-error.js");
const SHA256_RE = /^[a-f0-9]{64}$/i;
const sha256 = (v) => crypto_1.default.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');
// Pole user_data / match_keys, která Meta vyžaduje hashovaná
const PII_KEYS = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'ge', 'db', 'external_id', 'email', 'phone', 'madid'];
const hashPii = (obj) => {
    if (!obj || typeof obj !== 'object')
        return obj;
    const out = { ...obj };
    for (const key of PII_KEYS) {
        if (out[key] == null)
            continue;
        const hashOne = (v) => (typeof v === 'string' && v && !SHA256_RE.test(v)) ? sha256(v) : v;
        out[key] = Array.isArray(out[key]) ? out[key].map(hashOne) : hashOne(out[key]);
    }
    return out;
};
// --- Conversions API (CAPI) --------------------------------------------------
// Jeden server-side event na /{pixel_id}/events. event_id slouží k deduplikaci s browser pixelem.
const sendConversionEvent = async (args) => {
    try {
        if (!args.pixelId || !args.eventName)
            throw new Error('Chybí pixel_id nebo event_name.');
        const userData = hashPii((0, fb_graph_js_1.parseIfString)(args.userData, 'user_data'));
        if (!userData || Object.keys(userData).length === 0) {
            throw new Error('Chybí user_data (aspoň jeden identifikátor: em, ph, client_ip_address+client_user_agent, fbp/fbc…).');
        }
        const event = {
            event_name: args.eventName,
            event_time: args.eventTime ?? Math.floor(Date.now() / 1000),
            action_source: args.actionSource || 'website',
            user_data: userData,
            ...(args.eventId && { event_id: args.eventId }),
            ...(args.eventSourceUrl && { event_source_url: args.eventSourceUrl }),
            ...(args.customData && { custom_data: (0, fb_graph_js_1.parseIfString)(args.customData, 'custom_data') }),
        };
        const params = { data: JSON.stringify([event]) };
        if (args.testEventCode)
            params.test_event_code = args.testEventCode;
        const d = await (0, fb_graph_js_1.graphPost)(`${args.pixelId}/events`, params);
        return {
            success: true, eventsReceived: d.events_received ?? null, fbtraceId: d.fbtrace_id ?? null,
            message: `Event "${args.eventName}" odeslán na pixel ${args.pixelId} (events_received: ${d.events_received ?? '?'}`
                + `${args.testEventCode ? `, TEST režim: ${args.testEventCode}` : ''}).`,
        };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při odeslání CAPI eventu') };
    }
};
exports.sendConversionEvent = sendConversionEvent;
// Dávka eventů (pole event objektů dle CAPI schématu; user_data se hashuje automaticky)
const sendConversionEventsBatch = async (pixelId, events, testEventCode) => {
    try {
        if (!pixelId)
            throw new Error('Chybí pixel_id.');
        const list = (0, fb_graph_js_1.parseIfString)(events, 'events');
        if (!Array.isArray(list) || list.length === 0)
            throw new Error('events musí být neprázdné pole.');
        const prepared = list.map((ev) => ({
            ...ev,
            event_time: ev.event_time ?? Math.floor(Date.now() / 1000),
            action_source: ev.action_source || 'website',
            user_data: hashPii(ev.user_data),
        }));
        const params = { data: JSON.stringify(prepared) };
        if (testEventCode)
            params.test_event_code = testEventCode;
        const d = await (0, fb_graph_js_1.graphPost)(`${pixelId}/events`, params);
        return {
            success: true, eventsReceived: d.events_received ?? null,
            message: `Odesláno ${list.length} eventů na pixel ${pixelId} (events_received: ${d.events_received ?? '?'}).`,
        };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při odeslání CAPI dávky') };
    }
};
exports.sendConversionEventsBatch = sendConversionEventsBatch;
// --- Vlastní konverze (custom conversions) -----------------------------------
const CC_FIELDS = 'id,name,custom_event_type,rule,creation_time,is_archived,default_conversion_value,pixel{id,name}';
const listCustomConversions = async () => {
    try {
        const act = (0, fb_graph_js_1.requireActId)();
        const d = await (0, fb_graph_js_1.graphGet)(`${act}/customconversions`, { fields: CC_FIELDS, limit: '100' });
        const items = (d.data || []).map((c) => ({
            id: c.id, name: c.name, eventType: c.custom_event_type || null,
            rule: c.rule || null, pixelId: c.pixel?.id || null, archived: c.is_archived ?? false,
        }));
        return { success: true, items, message: `Nalezeno ${items.length} vlastních konverzí.` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při výpisu vlastních konverzí') };
    }
};
exports.listCustomConversions = listCustomConversions;
const getCustomConversion = async (id) => {
    try {
        if (!id)
            throw new Error('Chybí id konverze.');
        const c = await (0, fb_graph_js_1.graphGet)(id, { fields: CC_FIELDS });
        return {
            success: true,
            conversion: {
                id: c.id, name: c.name, eventType: c.custom_event_type || null, rule: c.rule || null,
                pixelId: c.pixel?.id || null, archived: c.is_archived ?? false,
                defaultValue: c.default_conversion_value ?? null, creationTime: c.creation_time || null,
            },
            message: `Konverze ${c.id} ("${c.name}") – event: ${c.custom_event_type || 'rule-based'}, pixel: ${c.pixel?.id || '—'}.`,
        };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při čtení vlastní konverze') };
    }
};
exports.getCustomConversion = getCustomConversion;
// custom_event_type (např. LEAD) NEBO rule (JSON, např. URL obsahuje /dekujeme)
const createCustomConversion = async (args) => {
    try {
        if (!args.name || !args.pixelId)
            throw new Error('Chybí name nebo pixel_id.');
        if (!args.customEventType && !args.rule) {
            throw new Error('Zadej custom_event_type (např. "LEAD") nebo rule (JSON pravidlo, např. {"and":[{"event":{"eq":"PageView"}},{"URL":{"i_contains":"/dekujeme"}}]}).');
        }
        const act = (0, fb_graph_js_1.requireActId)();
        const params = { name: args.name, event_source_id: args.pixelId };
        if (args.customEventType)
            params.custom_event_type = args.customEventType;
        if (args.rule)
            params.rule = JSON.stringify((0, fb_graph_js_1.parseIfString)(args.rule, 'rule'));
        if (args.defaultConversionValue != null)
            params.default_conversion_value = String(args.defaultConversionValue);
        const d = await (0, fb_graph_js_1.graphPost)(`${act}/customconversions`, params);
        return { success: true, conversionId: d.id, message: `Vlastní konverze "${args.name}" vytvořena. ID: ${d.id} (použitelné jako custom_conversion_id v promoted_object).` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při vytváření vlastní konverze') };
    }
};
exports.createCustomConversion = createCustomConversion;
const updateCustomConversion = async (id, updates) => {
    try {
        if (!id)
            throw new Error('Chybí id konverze.');
        const params = {};
        if (updates.name)
            params.name = updates.name;
        if (updates.defaultConversionValue != null)
            params.default_conversion_value = String(updates.defaultConversionValue);
        if (!Object.keys(params).length)
            throw new Error('Nebyly zadány žádné změny (name / default_conversion_value).');
        await (0, fb_graph_js_1.graphPost)(id, params);
        // Read-after-write
        const v = await (0, fb_graph_js_1.graphGet)(id, { fields: 'id,name,default_conversion_value' });
        if (updates.name && v.name !== updates.name) {
            return { success: false, message: `Úprava konverze se nepropsala (název je "${v.name}").` };
        }
        return { success: true, message: `Konverze ${id} upravena. Název: "${v.name}", výchozí hodnota: ${v.default_conversion_value ?? '—'}.` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při úpravě vlastní konverze') };
    }
};
exports.updateCustomConversion = updateCustomConversion;
const deleteCustomConversion = async (id) => {
    try {
        if (!id)
            throw new Error('Chybí id konverze.');
        await (0, fb_graph_js_1.graphDelete)(id);
        return { success: true, message: `Vlastní konverze ${id} smazána.` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při mazání vlastní konverze') };
    }
};
exports.deleteCustomConversion = deleteCustomConversion;
// --- Offline konverze ---------------------------------------------------------
const listOfflineConversionSets = async () => {
    try {
        const act = (0, fb_graph_js_1.requireActId)();
        const d = await (0, fb_graph_js_1.graphGet)(`${act}/offline_conversion_data_sets`, {
            fields: 'id,name,description,event_stats,last_upload_app,valid_entries,matched_entries', limit: '50',
        });
        const items = (d.data || []).map((s) => ({
            id: s.id, name: s.name, description: s.description || '',
            validEntries: s.valid_entries ?? null, matchedEntries: s.matched_entries ?? null,
        }));
        return { success: true, items, message: `Nalezeno ${items.length} offline event setů.` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při výpisu offline event setů') };
    }
};
exports.listOfflineConversionSets = listOfflineConversionSets;
// Vytvoření vyžaduje Business ID (bere se z env FACEBOOK_BUSINESS_ID, jde přepsat parametrem)
const createOfflineConversionSet = async (name, description, businessId) => {
    try {
        if (!name)
            throw new Error('Chybí name.');
        const biz = businessId || process.env.FACEBOOK_BUSINESS_ID;
        if (!biz)
            throw new Error('Chybí business_id (parametr business_id nebo env FACEBOOK_BUSINESS_ID).');
        const d = await (0, fb_graph_js_1.graphPost)(`${biz}/offline_conversion_data_sets`, {
            name, ...(description && { description }),
        });
        return { success: true, setId: d.id, message: `Offline event set "${name}" vytvořen. ID: ${d.id}` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při vytváření offline event setu') };
    }
};
exports.createOfflineConversionSet = createOfflineConversionSet;
// Upload offline konverzí: data = pole {match_keys:{em/ph/...}, event_time, event_name, value?, currency?}
const uploadOfflineConversions = async (setId, uploadTag, data) => {
    try {
        if (!setId || !uploadTag)
            throw new Error('Chybí set_id nebo upload_tag.');
        const list = (0, fb_graph_js_1.parseIfString)(data, 'data');
        if (!Array.isArray(list) || list.length === 0)
            throw new Error('data musí být neprázdné pole eventů.');
        const prepared = list.map((ev) => ({ ...ev, match_keys: hashPii(ev.match_keys) }));
        const d = await (0, fb_graph_js_1.graphPost)(`${setId}/events`, { upload_tag: uploadTag, data: JSON.stringify(prepared) });
        return {
            success: true, apiCallsMade: d.num_processed_entries ?? null,
            message: `Nahráno ${list.length} offline konverzí do setu ${setId} (tag: ${uploadTag}).`,
        };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při uploadu offline konverzí') };
    }
};
exports.uploadOfflineConversions = uploadOfflineConversions;
//# sourceMappingURL=conversion-tools.js.map