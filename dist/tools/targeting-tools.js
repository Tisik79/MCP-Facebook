"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateAudienceSize = exports.searchGeoLocations = exports.searchBehaviors = exports.getInterestSuggestions = exports.searchInterests = void 0;
// Targeting research – hledání zájmů/chování/lokalit a odhad velikosti publika.
// Vše read-only přes Graph API /search a /delivery_estimate.
const fb_graph_js_1 = require("./fb-graph.js");
const fb_error_js_1 = require("./fb-error.js");
const fmtSize = (lo, hi) => lo != null ? `${lo.toLocaleString('cs-CZ')}–${(hi ?? lo).toLocaleString('cs-CZ')}` : 'N/A';
// Hledání zájmů podle textu (type=adinterest)
const searchInterests = async (query, limit = 25) => {
    try {
        if (!query)
            throw new Error('Chybí hledaný výraz (query).');
        const d = await (0, fb_graph_js_1.graphGet)('search', { type: 'adinterest', q: query, limit: String(limit) });
        const items = (d.data || []).map((i) => ({
            id: i.id, name: i.name,
            audience: fmtSize(i.audience_size_lower_bound, i.audience_size_upper_bound),
            path: Array.isArray(i.path) ? i.path.join(' > ') : (i.topic || ''),
        }));
        return { success: true, items, message: `Nalezeno ${items.length} zájmů pro "${query}".` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při hledání zájmů') };
    }
};
exports.searchInterests = searchInterests;
// Návrhy podobných zájmů k zadaným (type=adinterestsuggestion)
const getInterestSuggestions = async (interestNames, limit = 25) => {
    try {
        if (!interestNames?.length)
            throw new Error('Chybí seznam zájmů (interest_names).');
        const d = await (0, fb_graph_js_1.graphGet)('search', {
            type: 'adinterestsuggestion',
            interest_list: JSON.stringify(interestNames),
            limit: String(limit),
        });
        const items = (d.data || []).map((i) => ({
            id: i.id, name: i.name,
            audience: fmtSize(i.audience_size_lower_bound, i.audience_size_upper_bound),
        }));
        return { success: true, items, message: `Nalezeno ${items.length} návrhů k [${interestNames.join(', ')}].` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při návrzích zájmů') };
    }
};
exports.getInterestSuggestions = getInterestSuggestions;
// Výpis dostupných chování (type=adTargetingCategory, class=behaviors)
const searchBehaviors = async (limit = 50) => {
    try {
        const d = await (0, fb_graph_js_1.graphGet)('search', { type: 'adTargetingCategory', class: 'behaviors', limit: String(limit) });
        const items = (d.data || []).map((b) => ({
            id: b.id, name: b.name,
            audience: fmtSize(b.audience_size_lower_bound, b.audience_size_upper_bound),
            description: b.description || '',
        }));
        return { success: true, items, message: `Nalezeno ${items.length} kategorií chování.` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při hledání chování') };
    }
};
exports.searchBehaviors = searchBehaviors;
// Hledání geolokací pro targeting (type=adgeolocation) – vrací klíče pro geo_locations
const searchGeoLocations = async (query, locationTypes, // country, region, city, zip, geo_market, electoral_district
countryCode, limit = 25) => {
    try {
        if (!query)
            throw new Error('Chybí hledaný výraz (query).');
        const params = { type: 'adgeolocation', q: query, limit: String(limit) };
        if (locationTypes?.length)
            params.location_types = JSON.stringify(locationTypes);
        if (countryCode)
            params.country_code = countryCode;
        const d = await (0, fb_graph_js_1.graphGet)('search', params);
        const items = (d.data || []).map((g) => ({
            key: g.key, name: g.name, type: g.type,
            region: g.region || null, countryCode: g.country_code || null, countryName: g.country_name || null,
        }));
        return { success: true, items, message: `Nalezeno ${items.length} lokalit pro "${query}". Hodnotu "key" použij v targeting.geo_locations (regions/cities/zips dle "type").` };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při hledání lokalit') };
    }
};
exports.searchGeoLocations = searchGeoLocations;
// Odhad velikosti publika pro daný targeting (delivery_estimate na úrovni účtu)
const estimateAudienceSize = async (targeting, optimizationGoal = 'REACH') => {
    try {
        const spec = (0, fb_graph_js_1.parseIfString)(targeting, 'targeting');
        if (!spec || typeof spec !== 'object')
            throw new Error('Chybí targeting spec (objekt).');
        const act = (0, fb_graph_js_1.requireActId)();
        const d = await (0, fb_graph_js_1.graphGet)(`${act}/delivery_estimate`, {
            targeting_spec: JSON.stringify(spec),
            optimization_goal: optimizationGoal,
        });
        const e = d.data?.[0] || {};
        return {
            success: true,
            estimate: {
                monthlyActiveUsersLower: e.estimate_mau_lower_bound ?? null,
                monthlyActiveUsersUpper: e.estimate_mau_upper_bound ?? null,
                estimateReady: e.estimate_ready ?? null,
            },
            message: `Odhad publika: ${fmtSize(e.estimate_mau_lower_bound, e.estimate_mau_upper_bound)} měsíčně aktivních uživatelů`
                + `${e.estimate_ready === false ? ' (odhad ještě není přesný – estimate_ready=false)' : ''}.`,
        };
    }
    catch (e) {
        return { success: false, message: (0, fb_error_js_1.formatFbError)(e, 'Chyba při odhadu publika') };
    }
};
exports.estimateAudienceSize = estimateAudienceSize;
//# sourceMappingURL=targeting-tools.js.map