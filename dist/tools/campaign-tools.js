"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCampaign = exports.getCampaignDetails = exports.updateCampaign = exports.getCampaigns = exports.createCampaign = void 0;
const facebook_nodejs_business_sdk_1 = require("facebook-nodejs-business-sdk");
const config_js_1 = require("../config.js"); // Added .js extension
const fb_error_js_1 = require("./fb-error.js");
// Získání instance AdAccount
const getAdAccount = () => {
    // Corrected config access
    if (!config_js_1.config.facebookAccountId) {
        throw new Error('Facebook Account ID není nakonfigurováno v config.js');
    }
    return new facebook_nodejs_business_sdk_1.AdAccount(config_js_1.config.facebookAccountId);
};
// Vytvoření nové kampaně
const createCampaign = async (name, objective, status, dailyBudget, startTime, endTime, special_ad_categories, // Added new optional parameter
bidStrategy // Strategie nabídek na úrovni kampaně (CBO)
) => {
    try {
        const adAccount = getAdAccount();
        // Připravení parametrů pro vytvoření kampaně
        const params = {
            name,
            objective,
            status
        };
        // Přidání volitelných parametrů pokud jsou poskytnuty
        if (dailyBudget) {
            params.daily_budget = dailyBudget * 100; // Facebook vyžaduje budget v nejmenších jednotkách měny (centy)
        }
        // Bid strategie kampaně. Platí jen u CBO (rozpočet na úrovni kampaně). Když uživatel
        // strategii nezadá a kampaň má rozpočet, defaultně LOWEST_COST_WITHOUT_CAP – ad set pak
        // nepotřebuje bid_amount. (Default Mety u CBO bývá cap strategie → ad set padá na 100/1815857.)
        const effectiveBidStrategy = bidStrategy ?? (dailyBudget ? 'LOWEST_COST_WITHOUT_CAP' : undefined);
        if (effectiveBidStrategy) {
            params.bid_strategy = effectiveBidStrategy;
        }
        if (startTime) {
            params.start_time = startTime;
        }
        if (endTime) {
            params.end_time = endTime;
        }
        // Add special_ad_categories if provided
        if (special_ad_categories && special_ad_categories.length > 0) {
            params.special_ad_categories = special_ad_categories;
            params.special_ad_categories = special_ad_categories;
        }
        // Define fields to retrieve after creation (Read-After-Write)
        const fieldsToRead = ['id', 'name', 'objective', 'status', 'created_time', 'daily_budget', 'bid_strategy'];
        // Vytvoření kampaně and request fields in response
        const result = await adAccount.createCampaign(fieldsToRead, params);
        // The result object itself should now contain the requested fields
        const campaignData = {
            id: result.id, // ID should be directly accessible
            name: result._data?.name,
            objective: result._data?.objective,
            status: result._data?.status,
            createdTime: result._data?.created_time,
            dailyBudget: result._data?.daily_budget ? result._data.daily_budget / 100 : null,
            bidStrategy: result._data?.bid_strategy ?? null,
        };
        return {
            success: true,
            campaignId: campaignData.id, // Keep campaignId for consistency
            campaignData: campaignData, // Return the fetched data
            message: 'Kampaň byla úspěšně vytvořena a data načtena.'
        };
    }
    catch (error) {
        console.error('Chyba při vytváření kampaně:', error);
        return {
            success: false,
            message: `Chyba při vytváření kampaně: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
        };
    }
};
exports.createCampaign = createCampaign;
// Získání seznamu kampaní
const getCampaigns = async (limit = 10, status) => {
    try {
        const adAccount = getAdAccount();
        // Nastavení filtrů pro získání kampaní - optimalizovaná pole
        const fields = ['id', 'name', 'objective', 'status', 'effective_status', 'created_time', 'daily_budget'];
        // Pozn.: Graph API nepodporuje filtrování kampaní přes field 'status' operací EQUAL → při
        // zadaném statusu načteme víc a filtrujeme lokálně.
        const params = { limit: status ? Math.max(limit, 100) : limit };
        // Získání kampaní
        const campaigns = await adAccount.getCampaigns(fields, params);
        let mapped = campaigns.map((campaign) => ({
            id: campaign.id, // ID is usually directly accessible
            name: campaign._data?.name,
            objective: campaign._data?.objective,
            status: campaign._data?.status,
            effectiveStatus: campaign._data?.effective_status,
            createdTime: campaign._data?.created_time,
            dailyBudget: campaign._data?.daily_budget ? campaign._data.daily_budget / 100 : null,
        }));
        if (status) {
            const s = status.toUpperCase();
            mapped = mapped.filter(c => c.status === s || c.effectiveStatus === s).slice(0, limit);
        }
        return {
            success: true,
            campaigns: mapped
        };
    }
    catch (error) {
        console.error('Chyba při získávání kampaní:', error);
        return {
            success: false,
            message: `Chyba při získávání kampaní: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
        };
    }
};
exports.getCampaigns = getCampaigns;
// Aktualizace kampaně
const updateCampaign = async (campaignId, name, status, dailyBudget, endTime, bidStrategy) => {
    try {
        // Příprava parametrů. Pozn.: zápis jde přímo na Graph API s explicitním tokenem –
        // SDK `campaign.update()` přes neinicializované default API tiše neukládá (no-op).
        const params = {};
        if (name)
            params.name = name;
        if (status)
            params.status = status;
        if (dailyBudget)
            params.daily_budget = String(dailyBudget * 100);
        if (endTime)
            params.end_time = endTime;
        // Bid strategie na úrovni kampaně. LOWEST_COST_WITHOUT_CAP = bez capu (ad set pak
        // nepotřebuje bid_amount). LOWEST_COST_WITH_BID_CAP/COST_CAP vyžadují bid_amount na ad setu.
        if (bidStrategy)
            params.bid_strategy = bidStrategy;
        if (Object.keys(params).length === 0) {
            throw new Error('Nebyly zadány žádné změny.');
        }
        const token = config_js_1.config.facebookAccessToken;
        if (!token)
            throw new Error('Chybí access token (přihlas se k Facebooku).');
        const GRAPH_VERSION = process.env.FB_GRAPH_API_VERSION || 'v25.0';
        // 1) Zápis
        const body = new URLSearchParams({ ...params, access_token: token });
        const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${campaignId}`, { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
            return { success: false, message: (0, fb_error_js_1.formatFbError)(data, 'Chyba při aktualizaci kampaně') };
        }
        // 2) Read-after-write – ověř, že se změny (zejména status a bid_strategy) opravdu propsaly.
        const vRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${campaignId}`
            + `?fields=name,status,effective_status,daily_budget,bid_strategy&access_token=${encodeURIComponent(token)}`);
        const v = await vRes.json().catch(() => ({}));
        if (v?.error) {
            return { success: false, message: (0, fb_error_js_1.formatFbError)(v, 'Chyba při ověření aktualizace kampaně') };
        }
        const mismatch = [];
        if (name && v.name !== name)
            mismatch.push(`název (požadováno "${name}", je "${v.name}")`);
        if (status && v.status !== status) {
            mismatch.push(`status (požadováno ${status}, je ${v.status}, effective_status ${v.effective_status})`);
        }
        if (bidStrategy && v.bid_strategy !== bidStrategy) {
            mismatch.push(`bid_strategy (požadováno ${bidStrategy}, je ${v.bid_strategy})`);
        }
        if (mismatch.length) {
            return {
                success: false,
                campaign: v,
                message: `Aktualizace kampaně se nepropsala: ${mismatch.join('; ')}. `
                    + `Meta zápis přijala, ale hodnotu nezměnila`
                    + (bidStrategy && v.bid_strategy !== bidStrategy
                        ? ` – bid_strategy u CBO za běhu nejspíš nepřepíná, založ kampaň nově s bidStrategy=${bidStrategy}.`
                        : ` – zkontroluj práva / důvod (např. aktivaci brzdí stav ad setu/reklamy nebo review).`)
            };
        }
        return {
            success: true,
            campaign: v,
            message: `Kampaň ${campaignId} aktualizována. Název: "${v.name}", status: ${v.status} `
                + `(effective_status: ${v.effective_status})${v.bid_strategy ? `, bid_strategy: ${v.bid_strategy}` : ''}.`
        };
    }
    catch (error) {
        console.error('Chyba při aktualizaci kampaně:', error);
        return {
            success: false,
            message: (0, fb_error_js_1.formatFbError)(error, 'Chyba při aktualizaci kampaně')
        };
    }
};
exports.updateCampaign = updateCampaign;
// Získání podrobností o kampani
const getCampaignDetails = async (campaignId) => {
    try {
        // Získání objektu kampaně
        const campaign = new facebook_nodejs_business_sdk_1.Campaign(campaignId);
        // Načtení detailů kampaně. Pozn.: Meta pole `budget_remaining` je matoucí (kolísá nelogicky),
        // proto ho nevracíme – místo něj počítáme orientační „zbývá dnes" = denní rozpočet − dnešní spend.
        const fields = [
            'id', 'name', 'objective', 'status', 'created_time',
            'start_time', 'stop_time', 'daily_budget', 'lifetime_budget',
            'spend_cap', 'buying_type', 'special_ad_categories',
            'bid_strategy'
        ];
        const campaignDetails = await campaign.get(fields);
        const d = campaignDetails._data || {};
        const dailyBudget = d.daily_budget ? d.daily_budget / 100 : null;
        // Dnešní útrata (v TZ účtu) přes insights; guarded – když selže, jen vynecháme.
        let spentToday = null;
        try {
            const ins = await campaign.getInsights(['spend'], { date_preset: 'today' });
            if (ins && ins.length)
                spentToday = parseFloat(ins[0]._data?.spend ?? ins[0].spend ?? '0');
        }
        catch { /* insights nemusí být k dispozici – nevadí */ }
        const remainingToday = (dailyBudget != null && spentToday != null)
            ? Math.max(0, Math.round((dailyBudget - spentToday) * 100) / 100)
            : null;
        return {
            success: true,
            campaign: {
                id: campaignDetails.id,
                name: d.name,
                objective: d.objective,
                status: d.status,
                createdTime: d.created_time,
                startTime: d.start_time,
                stopTime: d.stop_time,
                dailyBudget,
                lifetimeBudget: d.lifetime_budget ? d.lifetime_budget / 100 : null,
                spendCap: d.spend_cap ? d.spend_cap / 100 : null,
                spentToday,
                remainingToday, // orientačně: denní rozpočet − dnešní spend
                buyingType: d.buying_type,
                specialAdCategories: d.special_ad_categories,
                bidStrategy: d.bid_strategy ?? null
            }
        };
    }
    catch (error) {
        console.error('Chyba při získávání detailů kampaně:', error);
        return {
            success: false,
            message: `Chyba při získávání detailů kampaně: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
        };
    }
};
exports.getCampaignDetails = getCampaignDetails;
// Odstranění kampaně
const deleteCampaign = async (campaignId) => {
    try {
        // Získání objektu kampaně
        const campaign = new facebook_nodejs_business_sdk_1.Campaign(campaignId);
        // Odstranění kampaně - pass empty fields array
        await campaign.delete([]);
        return {
            success: true,
            message: 'Kampaň byla úspěšně odstraněna'
        };
    }
    catch (error) {
        console.error('Chyba při odstraňování kampaně:', error);
        return {
            success: false,
            message: `Chyba při odstraňování kampaně: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
        };
    }
};
exports.deleteCampaign = deleteCampaign;
//# sourceMappingURL=campaign-tools.js.map