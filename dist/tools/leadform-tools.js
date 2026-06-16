"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPixels = exports.getLeadForms = exports.createLeadForm = void 0;
const auth_manager_js_1 = require("../auth-manager.js");
const config_js_1 = require("../config.js");
const fb_error_js_1 = require("./fb-error.js");
// Graph API verze pro přímá HTTP volání (drží krok se zbytkem serveru – v25.0).
const GRAPH_VERSION = process.env.FB_GRAPH_API_VERSION || 'v25.0';
// --- Helpers ---------------------------------------------------------------
// Vrátí page_id + page access token. Priorita: připojená stránka z tokens.json,
// fallback na env (FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN).
const resolvePage = (pageId) => {
    const active = (0, auth_manager_js_1.getActivePage)();
    if (active && (!pageId || pageId === active.id)) {
        return { id: active.id, token: active.access_token };
    }
    // Explicitně zadané jiné page_id – zkus env page token, jinak user token.
    const envId = process.env.FACEBOOK_PAGE_ID;
    const envToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (pageId) {
        if (envId === pageId && envToken)
            return { id: pageId, token: envToken };
        // Nemáme dedikovaný page token – použij aktivní/user token (může selhat dle scope).
        const token = active?.access_token || (0, config_js_1.getActiveToken)();
        if (!token)
            throw new Error('Chybí access token (přihlas se k Facebooku: „Připoj Facebook účet").');
        return { id: pageId, token };
    }
    if (envId && envToken)
        return { id: envId, token: envToken };
    throw new Error('Není k dispozici žádná Facebook stránka. V Claude řekni: „Připoj Facebook účet".');
};
// Čitelná chybová hláška z Facebook API odpovědi (plná diagnostika přes sdílený formatter).
const fbError = (data, httpStatus, prefix) => {
    if (data?.error)
        return (0, fb_error_js_1.formatFbError)(data, prefix);
    return `${prefix}: HTTP ${httpStatus} – ${JSON.stringify(data)}`;
};
// --- create_lead_form ------------------------------------------------------
// POST /{page_id}/leadgen_forms (vyžaduje page token se scope pages_manage_ads,
// leads_retrieval, pages_show_list, ads_management).
const createLeadForm = async (args) => {
    try {
        if (!args.name)
            throw new Error('Chybí povinný parametr: name.');
        if (!args.privacyPolicy?.url) {
            throw new Error('Chybí privacy_policy.url – Meta vyžaduje odkaz na zásady ochrany osobních údajů.');
        }
        const { id: pageId, token } = resolvePage(args.pageId);
        const questions = args.questions && args.questions.length
            ? args.questions
            : [{ type: 'FULL_NAME' }, { type: 'EMAIL' }, { type: 'PHONE' }];
        // Komplexní pole se do Graph API posílají jako JSON řetězce.
        const body = new URLSearchParams();
        body.append('access_token', token);
        body.append('name', args.name);
        body.append('locale', args.locale || 'CS_CZ');
        body.append('privacy_policy', JSON.stringify(args.privacyPolicy));
        body.append('questions', JSON.stringify(questions));
        if (args.contextCard)
            body.append('context_card', JSON.stringify(args.contextCard));
        if (args.thankYouPage)
            body.append('thank_you_page', JSON.stringify(args.thankYouPage));
        if (args.followUpActionUrl)
            body.append('follow_up_action_url', args.followUpActionUrl);
        const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/leadgen_forms`;
        const res = await fetch(endpoint, { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error || !data?.id) {
            return { success: false, message: fbError(data, res.status, 'Chyba při vytváření lead formuláře') };
        }
        return {
            success: true,
            leadFormId: data.id,
            message: `Lead formulář "${args.name}" vytvořen na stránce ${pageId}. lead_gen_form_id: ${data.id}`,
        };
    }
    catch (error) {
        return { success: false, message: `Chyba při vytváření lead formuláře: ${error instanceof Error ? error.message : 'Neznámá chyba'}` };
    }
};
exports.createLeadForm = createLeadForm;
// --- get_lead_forms --------------------------------------------------------
// GET /{page_id}/leadgen_forms?fields=id,name,status,leads_count
const getLeadForms = async (pageId) => {
    try {
        const { id, token } = resolvePage(pageId);
        const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${id}/leadgen_forms`
            + `?fields=id,name,status,leads_count&limit=100&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(endpoint);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
            return { success: false, message: fbError(data, res.status, 'Chyba při načítání lead formulářů') };
        }
        const forms = (data.data || []).map((f) => ({
            id: f.id, name: f.name, status: f.status, leads_count: f.leads_count ?? 0,
        }));
        return { success: true, pageId: id, forms, message: `Nalezeno ${forms.length} lead formulářů na stránce ${id}.` };
    }
    catch (error) {
        return { success: false, message: `Chyba při načítání lead formulářů: ${error instanceof Error ? error.message : 'Neznámá chyba'}` };
    }
};
exports.getLeadForms = getLeadForms;
// --- get_pixels ------------------------------------------------------------
// GET /act_<id>/adspixels?fields=id,name → Pixel ID pro promoted_object.
const getPixels = async () => {
    try {
        const token = (0, config_js_1.getActiveToken)();
        if (!token)
            throw new Error('Chybí access token (přihlas se k Facebooku).');
        let accountId = (0, config_js_1.getActiveAccountId)();
        if (!accountId)
            throw new Error('Není k dispozici reklamní účet.');
        if (!accountId.startsWith('act_'))
            accountId = `act_${accountId}`;
        const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/adspixels`
            + `?fields=id,name&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(endpoint);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
            return { success: false, message: fbError(data, res.status, 'Chyba při načítání pixelů') };
        }
        const pixels = (data.data || []).map((p) => ({ id: p.id, name: p.name }));
        return { success: true, pixels, message: `Nalezeno ${pixels.length} pixelů na účtu ${accountId}.` };
    }
    catch (error) {
        return { success: false, message: `Chyba při načítání pixelů: ${error instanceof Error ? error.message : 'Neznámá chyba'}` };
    }
};
exports.getPixels = getPixels;
//# sourceMappingURL=leadform-tools.js.map