"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdSet = exports.createAdSet = void 0;
const facebook_nodejs_business_sdk_1 = require("facebook-nodejs-business-sdk");
const config_js_1 = require("../config.js");
const fb_error_js_1 = require("./fb-error.js");
// Helper function to get AdAccount instance
const getAdAccount = () => {
    if (!config_js_1.config.facebookAccountId) {
        throw new Error('Facebook Account ID není nakonfigurováno v config.js');
    }
    return new facebook_nodejs_business_sdk_1.AdAccount(config_js_1.config.facebookAccountId);
};
// --- Nástroje pro Ad Sets ---
// Vytvoření nové reklamní sady (Ad Set)
const createAdSet = async (campaignId, name, status, targeting, // Targeting spec can be complex, using 'any' for now
optimizationGoal, billingEvent, bidAmount, // Optional bid amount in cents
dailyBudget, // Optional daily budget in cents
lifetimeBudget, // Optional lifetime budget in cents
startTime, endTime, promotedObject, // Optional promoted_object (lead kampaně: pixel_id/custom_event_type nebo page_id)
destinationType, // Optional destination_type (WEBSITE, ON_AD, MESSENGER, PHONE_CALL, INSTAGRAM_DIRECT)
dsaBeneficiary, // EU DSA: kdo z reklamy těží (povinné u cílení na EU)
dsaPayor // EU DSA: kdo reklamu platí (default = beneficiary)
) => {
    try {
        const adAccount = getAdAccount();
        // Basic parameter validation
        if (!campaignId || !name || !status || !targeting || !optimizationGoal || !billingEvent) {
            throw new Error('Chybí povinné parametry pro vytvoření Ad Set (campaignId, name, status, targeting, optimizationGoal, billingEvent).');
        }
        if (dailyBudget && lifetimeBudget) {
            throw new Error('Nelze nastavit současně denní i celoživotní rozpočet.');
        }
        // Pozn.: rozpočet na úrovni ad setu NENÍ povinný. U účtů s CBO (rozpočet na úrovni
        // kampaně) se ad set zakládá bez rozpočtu a dědí ho z kampaně.
        // CBO detekce: pokud má parent kampaň vlastní rozpočet, ad-set rozpočet se do API
        // NEPOSÍLÁ – Meta kombinaci CBO + ad-set budget odmítá („Invalid parameter").
        let cboInherited = false;
        if (dailyBudget || lifetimeBudget) {
            try {
                const camp = await new facebook_nodejs_business_sdk_1.Campaign(campaignId).read(['daily_budget', 'lifetime_budget']);
                cboInherited = !!(camp?._data?.daily_budget || camp?._data?.lifetime_budget);
            }
            catch {
                // Pokud kampaň nelze načíst, necháme rozpočet projít a spolehneme se na API validaci.
            }
        }
        const effDailyBudget = cboInherited ? undefined : dailyBudget;
        const effLifetimeBudget = cboInherited ? undefined : lifetimeBudget;
        // DSA inzerent: explicitní param má přednost, jinak fallback z .env (config).
        // Payor se když chybí dorovná na beneficiary.
        const effDsaBeneficiary = dsaBeneficiary ?? config_js_1.config.dsaBeneficiary;
        const effDsaPayor = dsaPayor ?? config_js_1.config.dsaPayor ?? effDsaBeneficiary;
        const params = {
            campaign_id: campaignId,
            name: name,
            status: status,
            targeting: targeting, // Targeting spec object
            optimization_goal: optimizationGoal, // e.g., REACH, IMPRESSIONS, LINK_CLICKS, OFFSITE_CONVERSIONS, LEAD_GENERATION
            billing_event: billingEvent, // e.g., IMPRESSIONS, LINK_CLICKS
            // Add optional parameters
            ...(bidAmount && { bid_amount: bidAmount }),
            ...(effDailyBudget && { daily_budget: effDailyBudget }),
            ...(effLifetimeBudget && { lifetime_budget: effLifetimeBudget }),
            ...(startTime && { start_time: startTime }),
            ...(endTime && { end_time: endTime }),
            // Lead kampaně (OUTCOME_LEADS) – propsání 1:1 do Marketing API.
            ...(promotedObject && { promoted_object: promotedObject }),
            ...(destinationType && { destination_type: destinationType }),
            // EU DSA transparentnost – u cílení na EU Meta vyžaduje uvést inzerenta (dsa_beneficiary).
            // Priorita: explicitní param na ad setu → fallback z .env (config). Když plátce není
            // zadán, použije se stejná hodnota jako beneficiary.
            ...(effDsaBeneficiary && { dsa_beneficiary: effDsaBeneficiary }),
            ...(effDsaPayor && { dsa_payor: effDsaPayor }),
        };
        // Define fields to retrieve after creation
        const fieldsToRead = ['id', 'name', 'status', 'optimization_goal', 'billing_event', 'daily_budget', 'lifetime_budget', 'start_time', 'end_time', 'promoted_object', 'destination_type'];
        // Create AdSet and request fields in response
        const adSet = await adAccount.createAdSet(fieldsToRead, params);
        // The result object itself should now contain the requested fields
        const adSetData = {
            id: adSet.id, // ID should be directly accessible
            name: adSet._data?.name,
            status: adSet._data?.status,
            optimizationGoal: adSet._data?.optimization_goal,
            billingEvent: adSet._data?.billing_event,
            dailyBudget: adSet._data?.daily_budget ? adSet._data.daily_budget / 100 : null,
            lifetimeBudget: adSet._data?.lifetime_budget ? adSet._data.lifetime_budget / 100 : null,
            startTime: adSet._data?.start_time,
            endTime: adSet._data?.end_time,
            promotedObject: adSet._data?.promoted_object ?? null,
            destinationType: adSet._data?.destination_type ?? null,
            // Note: Targeting and bidAmount are not typically readable fields in the same way
        };
        return {
            success: true,
            adSetId: adSetData.id, // Keep adSetId for consistency
            adSetData: adSetData, // Return the fetched data
            message: cboInherited
                ? 'Reklamní sada byla úspěšně vytvořena. Rozpočet se dědí z kampaně (CBO) – ad-set rozpočet se neposílal.'
                : 'Reklamní sada byla úspěšně vytvořena a data načtena.'
        };
    }
    catch (error) {
        console.error('Chyba při vytváření reklamní sady:', error);
        return {
            success: false,
            message: (0, fb_error_js_1.formatFbError)(error, 'Chyba při vytváření reklamní sady')
        };
    }
};
exports.createAdSet = createAdSet;
// Úprava reklamní sady (status ACTIVE/PAUSED, název).
// Pozor: SDK `new AdSet(id).update(params)` je přes globální default API, které se zde
// neinicializuje tokenem → tichý no-op (request neodejde s platným tokenem). Proto jde
// úprava přímo na Graph API s explicitním tokenem + READ-AFTER-WRITE ověřením, ať se
// nevrací optimistické echo, ale skutečný stav po zápisu.
const updateAdSet = async (adSetId, updates) => {
    try {
        if (!adSetId)
            throw new Error('Chybí adSetId.');
        const params = {};
        if (updates.name)
            params.name = updates.name;
        if (updates.status)
            params.status = updates.status;
        if (Object.keys(params).length === 0) {
            throw new Error('Nebyly zadány žádné změny (name / status).');
        }
        const token = config_js_1.config.facebookAccessToken;
        if (!token)
            throw new Error('Chybí access token (přihlas se k Facebooku).');
        const GRAPH_VERSION = process.env.FB_GRAPH_API_VERSION || 'v25.0';
        // 1) Zápis
        const body = new URLSearchParams({ ...params, access_token: token });
        const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${adSetId}`, { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
            return { success: false, message: (0, fb_error_js_1.formatFbError)(data, 'Chyba při úpravě reklamní sady') };
        }
        // 2) Read-after-write – ověř, že se změna opravdu propsala
        const vRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${adSetId}`
            + `?fields=name,status,effective_status&access_token=${encodeURIComponent(token)}`);
        const v = await vRes.json().catch(() => ({}));
        if (v?.error) {
            return { success: false, message: (0, fb_error_js_1.formatFbError)(v, 'Chyba při ověření úpravy reklamní sady') };
        }
        const mismatch = [];
        if (updates.name && v.name !== updates.name) {
            mismatch.push(`název (požadováno "${updates.name}", je "${v.name}")`);
        }
        if (updates.status && v.status !== updates.status) {
            mismatch.push(`status (požadováno ${updates.status}, je ${v.status}, effective_status ${v.effective_status})`);
        }
        if (mismatch.length) {
            return {
                success: false,
                adSetId,
                message: `Úprava reklamní sady se nepropsala: ${mismatch.join('; ')}. `
                    + `Meta zápis přijala, ale stav se nezměnil – zkontroluj práva / stav účtu / důvod u ad setu.`
            };
        }
        return {
            success: true,
            adSetId,
            status: v.status,
            message: `Reklamní sada ${adSetId} upravena. Název: "${v.name}", status: ${v.status} (effective_status: ${v.effective_status}).`
        };
    }
    catch (error) {
        console.error('Chyba při úpravě reklamní sady:', error);
        return {
            success: false,
            message: (0, fb_error_js_1.formatFbError)(error, 'Chyba při úpravě reklamní sady')
        };
    }
};
exports.updateAdSet = updateAdSet;
// TODO: Implement getAdSets
// TODO: Implement getAdSetDetails
// TODO: Implement deleteAdSet
//# sourceMappingURL=adset-tools.js.map