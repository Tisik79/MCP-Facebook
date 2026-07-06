// Targeting research – hledání zájmů/chování/lokalit a odhad velikosti publika.
// Vše read-only přes Graph API /search a /delivery_estimate.
import { graphGet, requireActId, parseIfString } from './fb-graph.js';
import { formatFbError } from './fb-error.js';

const fmtSize = (lo?: number, hi?: number) =>
  lo != null ? `${lo.toLocaleString('cs-CZ')}–${(hi ?? lo).toLocaleString('cs-CZ')}` : 'N/A';

// Hledání zájmů podle textu (type=adinterest)
export const searchInterests = async (query: string, limit = 25) => {
  try {
    if (!query) throw new Error('Chybí hledaný výraz (query).');
    const d = await graphGet('search', { type: 'adinterest', q: query, limit: String(limit) });
    const items = (d.data || []).map((i: any) => ({
      id: i.id, name: i.name,
      audience: fmtSize(i.audience_size_lower_bound, i.audience_size_upper_bound),
      path: Array.isArray(i.path) ? i.path.join(' > ') : (i.topic || ''),
    }));
    return { success: true, items, message: `Nalezeno ${items.length} zájmů pro "${query}".` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při hledání zájmů') }; }
};

// Návrhy podobných zájmů k zadaným (type=adinterestsuggestion)
export const getInterestSuggestions = async (interestNames: string[], limit = 25) => {
  try {
    if (!interestNames?.length) throw new Error('Chybí seznam zájmů (interest_names).');
    const d = await graphGet('search', {
      type: 'adinterestsuggestion',
      interest_list: JSON.stringify(interestNames),
      limit: String(limit),
    });
    const items = (d.data || []).map((i: any) => ({
      id: i.id, name: i.name,
      audience: fmtSize(i.audience_size_lower_bound, i.audience_size_upper_bound),
    }));
    return { success: true, items, message: `Nalezeno ${items.length} návrhů k [${interestNames.join(', ')}].` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při návrzích zájmů') }; }
};

// Výpis dostupných chování (type=adTargetingCategory, class=behaviors)
export const searchBehaviors = async (limit = 50) => {
  try {
    const d = await graphGet('search', { type: 'adTargetingCategory', class: 'behaviors', limit: String(limit) });
    const items = (d.data || []).map((b: any) => ({
      id: b.id, name: b.name,
      audience: fmtSize(b.audience_size_lower_bound, b.audience_size_upper_bound),
      description: b.description || '',
    }));
    return { success: true, items, message: `Nalezeno ${items.length} kategorií chování.` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při hledání chování') }; }
};

// Hledání geolokací pro targeting (type=adgeolocation) – vrací klíče pro geo_locations
export const searchGeoLocations = async (
  query: string,
  locationTypes?: string[], // country, region, city, zip, geo_market, electoral_district
  countryCode?: string,
  limit = 25
) => {
  try {
    if (!query) throw new Error('Chybí hledaný výraz (query).');
    const params: Record<string, string> = { type: 'adgeolocation', q: query, limit: String(limit) };
    if (locationTypes?.length) params.location_types = JSON.stringify(locationTypes);
    if (countryCode) params.country_code = countryCode;
    const d = await graphGet('search', params);
    const items = (d.data || []).map((g: any) => ({
      key: g.key, name: g.name, type: g.type,
      region: g.region || null, countryCode: g.country_code || null, countryName: g.country_name || null,
    }));
    return { success: true, items, message: `Nalezeno ${items.length} lokalit pro "${query}". Hodnotu "key" použij v targeting.geo_locations (regions/cities/zips dle "type").` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při hledání lokalit') }; }
};

// Odhad velikosti publika pro daný targeting (delivery_estimate na úrovni účtu)
export const estimateAudienceSize = async (targeting: any, optimizationGoal = 'REACH') => {
  try {
    const spec = parseIfString(targeting, 'targeting');
    if (!spec || typeof spec !== 'object') throw new Error('Chybí targeting spec (objekt).');
    const act = requireActId();
    const d = await graphGet(`${act}/delivery_estimate`, {
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
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při odhadu publika') }; }
};
