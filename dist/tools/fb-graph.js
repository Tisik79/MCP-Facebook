"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIfString = exports.graphDelete = exports.graphPost = exports.graphGet = exports.requireActId = exports.requireToken = exports.GRAPH_VERSION = void 0;
// Sdílené helpery pro přímá volání Graph API (v25.0) s explicitním tokenem.
// Chyby se vyhazují v surové podobě ({ error: {...} }) – formatFbError je umí přečíst.
const config_js_1 = require("../config.js");
exports.GRAPH_VERSION = process.env.FB_GRAPH_API_VERSION || 'v25.0';
const requireToken = () => {
    const t = (0, config_js_1.getActiveToken)();
    if (!t)
        throw new Error('Chybí access token (přihlas se k Facebooku: „Připoj Facebook účet").');
    return t;
};
exports.requireToken = requireToken;
const requireActId = () => {
    const id = (0, config_js_1.getActiveAccountId)();
    if (!id)
        throw new Error('Není k dispozici reklamní účet. V Claude řekni: „Připoj Facebook účet".');
    return id.startsWith('act_') ? id : `act_${id}`;
};
exports.requireActId = requireActId;
const parse = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error)
        throw (data?.error ? data : new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`));
    return data;
};
const graphGet = async (path, params = {}) => {
    const qs = new URLSearchParams({ ...params, access_token: (0, exports.requireToken)() });
    return parse(await fetch(`https://graph.facebook.com/${exports.GRAPH_VERSION}/${path}?${qs}`));
};
exports.graphGet = graphGet;
const graphPost = async (path, params = {}) => {
    const body = new URLSearchParams({ ...params, access_token: (0, exports.requireToken)() });
    return parse(await fetch(`https://graph.facebook.com/${exports.GRAPH_VERSION}/${path}`, { method: 'POST', body }));
};
exports.graphPost = graphPost;
const graphDelete = async (path, params = {}) => {
    const qs = new URLSearchParams({ ...params, access_token: (0, exports.requireToken)() });
    return parse(await fetch(`https://graph.facebook.com/${exports.GRAPH_VERSION}/${path}?${qs}`, { method: 'DELETE' }));
};
exports.graphDelete = graphDelete;
// Objektové parametry můžou od klienta přijít jako JSON string – sjednocení na objekt.
const parseIfString = (v, label) => {
    if (typeof v !== 'string')
        return v;
    try {
        return JSON.parse(v);
    }
    catch {
        throw new Error(`Parametr ${label} přišel jako neplatný JSON string.`);
    }
};
exports.parseIfString = parseIfString;
//# sourceMappingURL=fb-graph.js.map