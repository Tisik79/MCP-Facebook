"use strict";
// Sdílené čitelné formátování chyb z Facebook/Graph API.
// Plná diagnostika (error_user_msg, error_subcode, error_data, fbtrace_id) napříč tvary chyb:
//  - SDK FacebookRequestError → celé Graph API „error" tělo je v `error.response`
//  - axios                    → `error.response.data.error`
//  - raw fetch (JSON tělo)    → `{ error: {...} }`
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFbError = extractFbError;
exports.formatFbError = formatFbError;
// Vytáhne samotný Graph API „error" objekt z různých obalů.
function extractFbError(error) {
    if (!error || typeof error !== 'object')
        return undefined;
    const e = error;
    // SDK FacebookRequestError: e.response = tělo (přímo „error" objekt s message/code/...).
    if (e.response && typeof e.response === 'object') {
        if (e.response.error)
            return e.response.error; // pro jistotu, kdyby bylo zabalené
        if (e.response.data?.error)
            return e.response.data.error; // axios tvar
        if (e.response.message || e.response.code != null)
            return e.response; // SDK tvar
    }
    // Raw fetch JSON, které jsme si sami předali jako objekt.
    if (e.error && typeof e.error === 'object')
        return e.error;
    return undefined;
}
// Sestaví jednu čitelnou řádku se všemi diagnostickými poli, co Graph API vrátil.
function formatFbError(error, prefix) {
    const fb = extractFbError(error);
    if (fb) {
        const code = fb.code != null
            ? ` (${fb.code}${fb.error_subcode ? `/${fb.error_subcode}` : ''})`
            : '';
        const parts = [`Facebook API Error${code}: ${fb.message || ''}`.trimEnd()];
        if (fb.type)
            parts.push(`type: ${fb.type}`);
        if (fb.error_user_title)
            parts.push(`title: ${fb.error_user_title}`);
        if (fb.error_user_msg)
            parts.push(`user_msg: ${fb.error_user_msg}`);
        if (fb.error_data != null) {
            parts.push(`error_data: ${typeof fb.error_data === 'string' ? fb.error_data : JSON.stringify(fb.error_data)}`);
        }
        if (fb.fbtrace_id)
            parts.push(`fbtrace_id: ${fb.fbtrace_id}`);
        return `${prefix}: ${parts.join(' | ')}`;
    }
    return `${prefix}: ${error instanceof Error ? error.message : 'Neznámá chyba'}`;
}
//# sourceMappingURL=fb-error.js.map