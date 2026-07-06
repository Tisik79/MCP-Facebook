"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
// McpError and ErrorCode removed from imports, will rely on standard Error or handle later if needed
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod"); // Import zod for schema definition
const config_js_1 = require("./config.js");
const auth_manager_js_1 = require("./auth-manager.js");
const child_process_1 = require("child_process");
const campaignTools = __importStar(require("./tools/campaign-tools.js"));
const audienceTools = __importStar(require("./tools/audience-tools.js"));
const analyticsTools = __importStar(require("./tools/analytics-tools.js"));
const adSetTools = __importStar(require("./tools/adset-tools.js")); // Import new adset tools
const postTools = __importStar(require("./tools/post-tools.js")); // Import post tools
const adTools = __importStar(require("./tools/ad-tools.js")); // Import ad/creative/media tools
const leadFormTools = __importStar(require("./tools/leadform-tools.js")); // Import lead form / pixel tools
const targetingTools = __importStar(require("./tools/targeting-tools.js")); // Targeting research (zájmy, chování, geo, odhad publika)
const pixelTools = __importStar(require("./tools/pixel-tools.js")); // Správa pixelů (create/update/detail/stats)
const conversionTools = __importStar(require("./tools/conversion-tools.js")); // CAPI + custom/offline konverze
// Návod, jak získat přístup k Facebooku. Plná verze: docs/FACEBOOK_APP_SETUP.md
const FB_APP_SETUP_GUIDE = [
    '════════ JAK PŘIPOJIT FACEBOOK – NEJSNAZŠÍ ZPŮSOB (cca 1 minuta, bez nastavování aplikace) ════════',
    '',
    '1) Otevři Graph API Explorer: https://developers.facebook.com/tools/explorer/',
    '2) Vpravo nahoře v poli "Meta App" / "Aplikace" vyber svou aplikaci.',
    '   (Ideálně tu samou, jejíž App ID/Secret má MCP – jinak token vydrží jen pár hodin.)',
    '3) Klikni "Generate Access Token" / "Generovat přístupový token" → vyber "Get User Access Token".',
    '4) Do vyhledávacího pole oprávnění postupně napiš a zaškrtni:',
    '     ads_management, ads_read, pages_show_list, pages_read_engagement,',
    '     pages_manage_posts, pages_manage_ads, business_management',
    '5) Klikni "Generate Access Token" → ve vyskakovacím okně Facebooku potvrď a povol přístup',
    '   ke stránkám / podnikání, které chceš spravovat.',
    '6) Zkopíruj vygenerovaný token (dlouhý řetězec, začíná "EAA...").',
    '7) Tady v Claude napiš:  Nastav Facebook token: EAA...(sem vlož ten token)',
    '   → MCP si sám stáhne a uloží stránky i reklamní účty a token prodlouží na ~60 dní.',
    '',
    'Nemáš žádnou aplikaci? V Graph API Exploreru klikni "Create App" (stačí typ "Business",',
    'libovolný název) – nebo jdi na https://developers.facebook.com/apps/ → "Vytvořit aplikaci".',
    'App ID a App Secret pak najdeš v Nastavení → Základní; pošli mi je a uložím je do fb-config.json',
    '(token z Exploreru pak půjde prodloužit na 60 dní).',
    '',
    '──────── ALTERNATIVA: přihlášení přes okno (OAuth) ────────',
    'Tohle vyžaduje nastavit aplikaci a Facebook často mění rozložení obrazovek, takže když',
    'některou položku nevidíš, použij raději postup s Graph API Explorerem výše.',
    '  a) Musí být přidaný produkt "Facebook Login" (nebo use case "Authenticate ... with Facebook Login").',
    '     V novém rozhraní: levé menu → "Use cases" → přidat/Customize → tam je sekce Settings.',
    '  b) V Nastavení → Základní: pole "Domény aplikací" = localhost; dole "+ Přidat platformu" → "Web"',
    '     → URL webu: http://localhost:3456/  → Uložit.',
    '  c) Facebook Login → Settings (nebo Use cases → ... → Settings):',
    '     "Client OAuth Login" = Ano, "Web OAuth Login" = Ano,',
    '     "Valid OAuth Redirect URIs" = http://localhost:3456/auth/callback  → Uložit.',
    '  d) Režim aplikace stačí "Vývoj" (přihlašuješ se svým účtem). Pak v Claude: "Připoj Facebook účet".',
    '',
    'Stav serveru lze kdykoli ověřit i v prohlížeči: http://localhost:3456/status',
].join('\n');
// Funkce pro inicializaci serveru
const initializeServer = async () => {
    // Server smí nastartovat i bez přihlášení – uživatel se může přihlásit za běhu
    // pomocí nástroje `connect_facebook_account`. Proto tady nic nevyhazujeme.
    if (!(0, config_js_1.validateConfig)()) {
        console.error('[Facebook MCP] Zatím nejsi přihlášen k Facebooku. V Claude řekni: „Připoj Facebook účet".');
    }
    if (!(0, config_js_1.initFacebookSdk)()) {
        console.error('[Facebook MCP] Facebook SDK zatím bez tokenu – nejdřív se přihlas.');
    }
    // Vytvoření serveru pomocí konstruktoru McpServer
    const server = new mcp_js_1.McpServer({
        name: 'facebook-ads-mcp-server',
        version: '1.0.0',
    });
    // --- Registrace nástrojů pro správu kampaní ---
    server.tool('create_campaign', 
    // Pass the raw shape object directly, not z.object()
    {
        name: zod_1.z.string().describe('Název kampaně'),
        // Removed duplicated objective, status, dailyBudget lines below
        objective: zod_1.z.string().describe('Cíl kampaně (POVOLENÉ HODNOTY: OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_APP_PROMOTION)'), // Keep the updated description
        status: zod_1.z.string().describe('Status kampaně (ACTIVE, PAUSED)'), // Keep one status line
        dailyBudget: zod_1.z.string().optional().describe('Denní rozpočet v měně účtu (např. "1000.50")'), // Keep one dailyBudget line
        startTime: zod_1.z.string().optional().describe('Čas začátku kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)'),
        endTime: zod_1.z.string().optional().describe('Čas konce kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)'),
        // Made special_ad_categories required and non-empty
        special_ad_categories: zod_1.z.array(zod_1.z.string()).nonempty().describe('Speciální kategorie reklam (POVINNÉ, MUSÍ obsahovat alespoň jednu platnou hodnotu, např. ["HOUSING"], ["EMPLOYMENT"], ["CREDIT"], ["ISSUES_ELECTIONS_POLITICS"])'),
        bidStrategy: zod_1.z.enum(['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP']).optional().describe('Strategie nabídek kampaně (jen u CBO – s rozpočtem na kampani). Default LOWEST_COST_WITHOUT_CAP = bez capu (ad set pak nepotřebuje bidAmount). LOWEST_COST_WITH_BID_CAP / COST_CAP vyžadují bidAmount na ad setu.')
    }, 
    // Destructure arguments directly in the handler signature
    async ({ name, objective, status, dailyBudget, startTime, endTime, special_ad_categories, bidStrategy }) => {
        const result = await campaignTools.createCampaign(name, objective, status, dailyBudget ? parseFloat(dailyBudget) : undefined, startTime, endTime, special_ad_categories, // Pass the new parameter
        bidStrategy // Bid strategie kampaně (default WITHOUT_CAP u CBO)
        );
        // Adjust the response text to include details from result.campaignData
        let campaignResponseText = result.success
            ? `Kampaň byla úspěšně vytvořena (ID: ${result.campaignId}).\n\n`
            : `Chyba při vytváření kampaně: ${result.message}`;
        if (result.success && result.campaignData) {
            campaignResponseText += `Detaily:\n` +
                `  - Název: ${result.campaignData.name}\n` +
                `  - Cíl: ${result.campaignData.objective}\n` +
                `  - Status: ${result.campaignData.status}\n` +
                (result.campaignData.dailyBudget ? `  - Denní rozpočet: ${result.campaignData.dailyBudget}\n` : '') +
                (result.campaignData.bidStrategy ? `  - Bid strategy: ${result.campaignData.bidStrategy}\n` : '') +
                (result.campaignData.createdTime ? `  - Vytvořeno: ${new Date(result.campaignData.createdTime).toLocaleString()}\n` : '');
        }
        return {
            content: [{ type: 'text', text: campaignResponseText }]
        };
    });
    server.tool('get_campaigns', {
        limit: zod_1.z.string().optional().describe('Maximální počet kampaní k zobrazení (číslo)'),
        status: zod_1.z.string().optional().describe('Filtrování podle statusu (ACTIVE, PAUSED, ARCHIVED)')
    }, async ({ limit, status }) => {
        const result = await campaignTools.getCampaigns(limit ? parseInt(limit) : undefined, status);
        if (!result.success) {
            return { content: [{ type: 'text', text: `❌ Chyba při získávání kampaní: ${result.message}` }], isError: true };
        }
        let responseText = `📋 Seznam reklamních kampaní (celkem ${result.campaigns?.length || 0}):\n\n`;
        if (!result.campaigns || result.campaigns.length === 0) {
            responseText += 'Nebyly nalezeny žádné kampaně odpovídající zadaným kritériím.';
        }
        else {
            result.campaigns.forEach((campaign, index) => {
                responseText += `${index + 1}. **${campaign.name}** (ID: ${campaign.id})\n`;
                responseText += `   - Cíl: ${campaign.objective || 'N/A'}\n`;
                responseText += `   - Status: ${campaign.status || 'N/A'}\n`;
                responseText += `   - Denní rozpočet: ${campaign.dailyBudget ? `${campaign.dailyBudget}` : 'Není nastaven'}\n`;
                responseText += `   - Vytvořeno: ${campaign.createdTime ? new Date(campaign.createdTime).toLocaleDateString() : 'N/A'}\n\n`;
            });
        }
        return { content: [{ type: 'text', text: responseText }] };
    });
    server.tool('get_campaign_details', {
        campaignId: zod_1.z.string().describe('ID kampaně')
    }, async ({ campaignId }) => {
        const result = await campaignTools.getCampaignDetails(campaignId);
        if (!result.success || !result.campaign) {
            return { content: [{ type: 'text', text: `❌ Chyba při získávání detailů kampaně: ${result.message}` }], isError: true };
        }
        const campaign = result.campaign;
        let responseText = `📊 Detaily kampaně "${campaign.name}" (ID: ${campaign.id}):\n\n`;
        responseText += `- **Základní informace:**\n`;
        responseText += `  - Cíl: ${campaign.objective || 'N/A'}\n`;
        responseText += `  - Status: ${campaign.status || 'N/A'}\n`;
        responseText += `  - Typ nákupu: ${campaign.buyingType || 'N/A'}\n`;
        responseText += `  - Bid strategy: ${campaign.bidStrategy || 'N/A'}\n`;
        responseText += `\n- **Rozpočet a finance:**\n`;
        responseText += campaign.dailyBudget ? `  - Denní rozpočet: ${campaign.dailyBudget}\n` : '';
        responseText += campaign.lifetimeBudget ? `  - Celoživotní rozpočet: ${campaign.lifetimeBudget}\n` : '';
        responseText += campaign.spendCap ? `  - Limit výdajů: ${campaign.spendCap}\n` : '';
        responseText += (campaign.spentToday != null) ? `  - Dnešní útrata: ${campaign.spentToday}\n` : '';
        responseText += (campaign.remainingToday != null) ? `  - Zbývá dnes (orientačně): ${campaign.remainingToday}\n` : '';
        if (!campaign.dailyBudget && !campaign.lifetimeBudget && !campaign.spendCap) {
            responseText += `  (Žádné informace o rozpočtu)\n`;
        }
        responseText += `\n- **Časové údaje:**\n`;
        responseText += `  - Vytvořeno: ${campaign.createdTime ? new Date(campaign.createdTime).toLocaleString() : 'N/A'}\n`;
        responseText += campaign.startTime ? `  - Začátek: ${new Date(campaign.startTime).toLocaleString()}\n` : '';
        responseText += campaign.stopTime ? `  - Konec: ${new Date(campaign.stopTime).toLocaleString()}\n` : '';
        if (!campaign.startTime && !campaign.stopTime) {
            responseText += `  (Žádné informace o časech)\n`;
        }
        if (campaign.specialAdCategories && campaign.specialAdCategories.length > 0) {
            responseText += `\n- **Speciální kategorie reklam:** ${campaign.specialAdCategories.join(', ')}\n`;
        }
        return { content: [{ type: 'text', text: responseText }] };
    });
    server.tool('update_campaign', {
        campaignId: zod_1.z.string().describe('ID kampaně k aktualizaci'),
        name: zod_1.z.string().optional().describe('Nový název kampaně'),
        status: zod_1.z.string().optional().describe('Nový status kampaně (ACTIVE, PAUSED)'),
        dailyBudget: zod_1.z.string().optional().describe('Nový denní rozpočet v měně účtu (např. "1500.00")'),
        endTime: zod_1.z.string().optional().describe('Nový čas konce kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)'),
        bidStrategy: zod_1.z.enum(['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP']).optional().describe('Strategie nabídek kampaně. LOWEST_COST_WITHOUT_CAP = bez capu (ad set pak nepotřebuje bidAmount). LOWEST_COST_WITH_BID_CAP / COST_CAP vyžadují bidAmount na ad setu.')
    }, async ({ campaignId, name, status, dailyBudget, endTime, bidStrategy }) => {
        // Check if at least one updateable field is provided
        if (!name && !status && !dailyBudget && !endTime && !bidStrategy) {
            // Throw standard Error or handle appropriately, McpError might not be available
            throw new Error('Musí být poskytnut alespoň jeden parametr k aktualizaci (name, status, dailyBudget, endTime, bidStrategy).');
        }
        const result = await campaignTools.updateCampaign(campaignId, name, status, dailyBudget ? parseFloat(dailyBudget) : undefined, endTime, bidStrategy);
        return {
            // Removed leading emojis
            content: [{ type: 'text', text: result.success ? `Kampaň (ID: ${campaignId}) byla úspěšně aktualizována!\n\n${result.message || ''}` : `Chyba při aktualizaci kampaně (ID: ${campaignId}): ${result.message}` }]
        };
    });
    server.tool('delete_campaign', {
        campaignId: zod_1.z.string().describe('ID kampaně k odstranění')
    }, async ({ campaignId }) => {
        const result = await campaignTools.deleteCampaign(campaignId);
        return {
            // Removed leading emojis
            content: [{ type: 'text', text: result.success ? `Kampaň (ID: ${campaignId}) byla úspěšně odstraněna!\n\n${result.message || ''}` : `Chyba při odstraňování kampaně (ID: ${campaignId}): ${result.message}` }]
        };
    });
    // --- Registrace nástrojů pro analýzu a vyhodnocování ---
    server.tool('get_campaign_insights', {
        campaignId: zod_1.z.string().describe('ID kampaně'),
        since: zod_1.z.string().describe('Datum začátku ve formátu YYYY-MM-DD'),
        until: zod_1.z.string().describe('Datum konce ve formátu YYYY-MM-DD'),
        metrics: zod_1.z.string().optional().describe('Volitelný seznam metrik oddělených čárkou (např. impressions,clicks,spend). Výchozí: impressions, clicks, spend, cpc, ctr, reach, frequency, actions')
    }, async ({ campaignId, since, until, metrics }) => {
        const timeRange = { since, until };
        let metricsArray = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency', 'actions'];
        if (metrics) {
            metricsArray = metrics.split(',').map(m => m.trim()).filter(m => m.length > 0);
        }
        const result = await analyticsTools.getCampaignInsights(campaignId, timeRange, metricsArray);
        if (!result.success) {
            return { content: [{ type: 'text', text: `❌ Chyba při získávání analytických dat: ${result.message}` }], isError: true };
        }
        if (!result.insights || result.insights.length === 0) {
            return { content: [{ type: 'text', text: `ℹ️ Nebyla nalezena žádná analytická data pro kampaň ${campaignId} v období ${since} - ${until}. ${result.message || ''}` }] };
        }
        const summaryInsight = result.insights[0];
        let responseText = `📈 Analytická data kampaně (ID: ${campaignId}) za období ${summaryInsight.date_start || since} - ${summaryInsight.date_stop || until}:\n\n`;
        responseText += `**Souhrn:**\n`;
        metricsArray.forEach(metric => {
            if (summaryInsight[metric] !== undefined) {
                if (metric === 'actions' && Array.isArray(summaryInsight[metric])) {
                    responseText += `- ${metric}:\n`;
                    summaryInsight[metric].forEach((action) => {
                        responseText += `    - ${action.action_type}: ${action.value}\n`;
                    });
                }
                else {
                    responseText += `- ${metric}: ${summaryInsight[metric]}\n`;
                }
            }
        });
        const totalImpressions = parseInt(summaryInsight.impressions || '0');
        const totalClicks = parseInt(summaryInsight.clicks || '0');
        const totalSpend = parseFloat(summaryInsight.spend || '0');
        if (totalClicks > 0) {
            responseText += `- calculated_cpc: ${(totalSpend / totalClicks).toFixed(2)}\n`;
        }
        if (totalImpressions > 0) {
            responseText += `- calculated_ctr: ${((totalClicks / totalImpressions) * 100).toFixed(2)}%\n`;
            responseText += `- calculated_cpm: ${((totalSpend / totalImpressions) * 1000).toFixed(2)}\n`;
        }
        if (result.insights.length > 1) {
            responseText += `\n**Detailní přehled (po dnech/rozpadech):**\n`;
            result.insights.forEach((insight, index) => {
                responseText += `\n* Záznam ${index + 1} (${insight.date_start} - ${insight.date_stop}):\n`;
                metricsArray.forEach(metric => {
                    if (insight[metric] !== undefined) {
                        if (metric === 'actions' && Array.isArray(insight[metric])) {
                            responseText += `  - ${metric}:\n`;
                            insight[metric].forEach((action) => {
                                responseText += `      - ${action.action_type}: ${action.value}\n`;
                            });
                        }
                        else {
                            responseText += `  - ${metric}: ${insight[metric]}\n`;
                        }
                    }
                });
            });
        }
        return { content: [{ type: 'text', text: responseText }] };
    });
    // --- Registrace nástrojů pro insights Ad Setů ---
    server.tool('get_adset_insights', {
        adSetId: zod_1.z.string().describe('ID reklamní sady (Ad Set)'),
        since: zod_1.z.string().describe('Datum začátku ve formátu YYYY-MM-DD'),
        until: zod_1.z.string().describe('Datum konce ve formátu YYYY-MM-DD'),
        metrics: zod_1.z.string().optional().describe('Volitelný seznam metrik oddělených čárkou (např. impressions,clicks,spend). Výchozí: impressions, clicks, spend, cpc, ctr, reach, frequency, actions')
    }, async ({ adSetId, since, until, metrics }) => {
        const timeRange = { since, until };
        let metricsArray = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency', 'actions'];
        if (metrics) {
            metricsArray = metrics.split(',').map(m => m.trim()).filter(m => m.length > 0);
        }
        const result = await analyticsTools.getAdSetInsights(adSetId, timeRange, metricsArray);
        if (!result.success) {
            return { content: [{ type: 'text', text: `❌ Chyba při získávání analytických dat Ad Set: ${result.message}` }], isError: true };
        }
        if (!result.insights || result.insights.length === 0) {
            return { content: [{ type: 'text', text: `ℹ️ Nebyla nalezena žádná analytická data pro Ad Set ${adSetId} v období ${since} - ${until}. ${result.message || ''}` }] };
        }
        const summaryInsight = result.insights[0];
        let responseText = `📈 Analytická data Ad Set (ID: ${adSetId}) za období ${summaryInsight.date_start || since} - ${summaryInsight.date_stop || until}:\n\n`;
        responseText += `**Souhrn:**\n`;
        metricsArray.forEach(metric => {
            if (summaryInsight[metric] !== undefined) {
                if (metric === 'actions' && Array.isArray(summaryInsight[metric])) {
                    responseText += `- ${metric}:\n`;
                    summaryInsight[metric].forEach((action) => {
                        responseText += `    - ${action.action_type}: ${action.value}\n`;
                    });
                }
                else {
                    responseText += `- ${metric}: ${summaryInsight[metric]}\n`;
                }
            }
        });
        return { content: [{ type: 'text', text: responseText }] };
    });
    // --- Registrace nástrojů pro insights jednotlivých reklam ---
    server.tool('get_ad_insights', {
        adId: zod_1.z.string().describe('ID reklamy (Ad)'),
        since: zod_1.z.string().describe('Datum začátku ve formátu YYYY-MM-DD'),
        until: zod_1.z.string().describe('Datum konce ve formátu YYYY-MM-DD'),
        metrics: zod_1.z.string().optional().describe('Volitelný seznam metrik oddělených čárkou (např. impressions,clicks,spend). Výchozí: impressions, clicks, spend, cpc, ctr, reach, frequency, actions')
    }, async ({ adId, since, until, metrics }) => {
        const timeRange = { since, until };
        let metricsArray = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency', 'actions'];
        if (metrics) {
            metricsArray = metrics.split(',').map(m => m.trim()).filter(m => m.length > 0);
        }
        const result = await analyticsTools.getAdInsights(adId, timeRange, metricsArray);
        if (!result.success) {
            return { content: [{ type: 'text', text: `❌ Chyba při získávání analytických dat reklamy: ${result.message}` }], isError: true };
        }
        if (!result.insights || result.insights.length === 0) {
            return { content: [{ type: 'text', text: `ℹ️ Nebyla nalezena žádná analytická data pro reklamu ${adId} v období ${since} - ${until}. ${result.message || ''}` }] };
        }
        const summaryInsight = result.insights[0];
        let responseText = `📈 Analytická data reklamy (ID: ${adId}) za období ${summaryInsight.date_start || since} - ${summaryInsight.date_stop || until}:\n\n`;
        responseText += `**Souhrn:**\n`;
        metricsArray.forEach(metric => {
            if (summaryInsight[metric] !== undefined) {
                if (metric === 'actions' && Array.isArray(summaryInsight[metric])) {
                    responseText += `- ${metric}:\n`;
                    summaryInsight[metric].forEach((action) => {
                        responseText += `    - ${action.action_type}: ${action.value}\n`;
                    });
                }
                else {
                    responseText += `- ${metric}: ${summaryInsight[metric]}\n`;
                }
            }
        });
        return { content: [{ type: 'text', text: responseText }] };
    });
    // --- Registrace nástrojů pro získání seznamu Ad Setů ---
    server.tool('get_adsets', {
        campaignId: zod_1.z.string().optional().describe('Volitelné ID kampaně pro filtrování'),
        limit: zod_1.z.string().optional().describe('Maximální počet Ad Setů k zobrazení (výchozí: 25)'),
        status: zod_1.z.string().optional().describe('Filtrování podle statusu (ACTIVE, PAUSED, ARCHIVED)')
    }, async ({ campaignId, limit, status }) => {
        const result = await analyticsTools.getAdSets(campaignId, limit ? parseInt(limit) : 25, status);
        if (!result.success) {
            return { content: [{ type: 'text', text: `❌ Chyba při získávání Ad Setů: ${result.message}` }], isError: true };
        }
        let responseText = `📋 Seznam reklamních sad (celkem ${result.adSets?.length || 0}):\n\n`;
        if (!result.adSets || result.adSets.length === 0) {
            responseText += 'Nebyly nalezeny žádné reklamní sady odpovídající zadaným kritériím.';
        }
        else {
            result.adSets.forEach((adSet, index) => {
                responseText += `${index + 1}. **${adSet.name}** (ID: ${adSet.id})\n`;
                responseText += `   - Status: ${adSet.status || 'N/A'} (${adSet.effectiveStatus || 'N/A'})\n`;
                responseText += `   - Kampaň ID: ${adSet.campaignId || 'N/A'}\n`;
                responseText += `   - Optimalizace: ${adSet.optimizationGoal || 'N/A'}\n`;
                responseText += `   - Rozpočet: ${adSet.dailyBudget ? `${adSet.dailyBudget}/den` : adSet.lifetimeBudget ? `${adSet.lifetimeBudget} celkem` : 'Není nastaven'}\n\n`;
            });
        }
        return { content: [{ type: 'text', text: responseText }] };
    });
    // --- Registrace nástrojů pro získání seznamu reklam ---
    server.tool('get_ads', {
        adSetId: zod_1.z.string().optional().describe('Volitelné ID Ad Set pro filtrování'),
        campaignId: zod_1.z.string().optional().describe('Volitelné ID kampaně pro filtrování'),
        limit: zod_1.z.string().optional().describe('Maximální počet reklam k zobrazení (výchozí: 25)'),
        status: zod_1.z.string().optional().describe('Filtrování podle statusu (ACTIVE, PAUSED, ARCHIVED)')
    }, async ({ adSetId, campaignId, limit, status }) => {
        const result = await analyticsTools.getAds(adSetId, campaignId, limit ? parseInt(limit) : 25, status);
        if (!result.success) {
            return { content: [{ type: 'text', text: `❌ Chyba při získávání reklam: ${result.message}` }], isError: true };
        }
        let responseText = `📋 Seznam reklam (celkem ${result.ads?.length || 0}):\n\n`;
        if (!result.ads || result.ads.length === 0) {
            responseText += 'Nebyly nalezeny žádné reklamy odpovídající zadaným kritériím.';
        }
        else {
            result.ads.forEach((ad, index) => {
                responseText += `${index + 1}. **${ad.name}** (ID: ${ad.id})\n`;
                responseText += `   - Status: ${ad.status || 'N/A'} (${ad.effectiveStatus || 'N/A'})\n`;
                responseText += `   - Ad Set ID: ${ad.adSetId || 'N/A'}\n`;
                responseText += `   - Kampaň ID: ${ad.campaignId || 'N/A'}\n`;
                responseText += `   - Vytvořeno: ${ad.createdTime ? new Date(ad.createdTime).toLocaleDateString() : 'N/A'}\n\n`;
            });
        }
        return { content: [{ type: 'text', text: responseText }] };
    });
    // --- Registrace nástrojů pro správu publik ---
    server.tool('create_custom_audience', {
        name: zod_1.z.string().describe('Název publika'),
        subtype: zod_1.z.string().describe('Podtyp publika (CUSTOM, WEBSITE, ENGAGEMENT). Pro LOOKALIKE použij nástroj create_lookalike_audience.'), // Clarified subtype usage
        description: zod_1.z.string().optional().describe('Volitelný popis publika'),
        customer_file_source: zod_1.z.string().optional().describe('Zdroj dat pro CUSTOM subtype (POVINNÉ pro CUSTOM, např. USER_PROVIDED_ONLY)'), // Clarified requirement
        rule: zod_1.z.object({}).passthrough().optional().describe('Pravidlo pro WEBSITE nebo ENGAGEMENT subtype (POVINNÉ pro WEBSITE/ENGAGEMENT, komplexní JSON objekt dle FB API - viz dokumentace)') // Clarified requirement and complexity
    }, async ({ name, subtype, description, customer_file_source }) => {
        if (subtype === 'CUSTOM' && (!description || !customer_file_source)) {
            // Throw standard Error or handle appropriately
            throw new Error('Parametry description a customer_file_source jsou povinné pro CUSTOM subtype.');
        }
        // TODO: Add validation for other subtypes if necessary
        const result = await audienceTools.createCustomAudience(name, description || '', customer_file_source || '', subtype
        // Pass rule if the underlying function supports it
        );
        // Adjust the response text to include details from result.audienceData
        let audienceResponseText = result.success
            ? `Vlastní publikum "${name}" (typ: ${subtype}) bylo úspěšně vytvořeno (ID: ${result.audienceId}).\n\n`
            : `Chyba při vytváření publika: ${result.message}`;
        if (result.success && result.audienceData) {
            audienceResponseText += `Detaily:\n` +
                `  - Název: ${result.audienceData.name}\n` +
                `  - Popis: ${result.audienceData.description || '-'}\n` +
                `  - Subtyp: ${result.audienceData.subtype}\n` +
                `  - Přibližná velikost: ${result.audienceData.approximateCount || 'N/A'}\n`;
        }
        return {
            content: [{ type: 'text', text: audienceResponseText }]
        };
    });
    server.tool('get_audiences', {
        limit: zod_1.z.string().optional().describe('Maximální počet publik k zobrazení (číslo)')
    }, async ({ limit }) => {
        const result = await audienceTools.getCustomAudiences(limit ? parseInt(limit) : undefined);
        if (!result.success || !result.audiences) {
            return { content: [{ type: 'text', text: `❌ Chyba při získávání publik: ${result.message}` }], isError: true };
        }
        let responseText = `👥 Seznam dostupných vlastních publik (celkem ${result.audiences.length}):\n\n`;
        if (result.audiences.length === 0) {
            responseText += 'Nebyly nalezeny žádná publika.';
        }
        else {
            result.audiences.forEach((audience, index) => {
                responseText += `${index + 1}. **${audience.name}** (ID: ${audience.id})\n`;
                responseText += `   - Typ: ${audience.subtype || 'N/A'}\n`;
                responseText += `   - Přibližná velikost: ${audience.approximateCount ? audience.approximateCount : 'N/A'}\n`;
                responseText += `   - Popis: ${audience.description || '-'}\n\n`;
            });
        }
        return { content: [{ type: 'text', text: responseText }] };
    });
    server.tool('create_lookalike_audience', // Tool specifically for Lookalike audiences
    {
        sourceAudienceId: zod_1.z.string().describe('ID zdrojového Custom Audience (musí existovat)'),
        name: zod_1.z.string().describe('Název nového Lookalike Audience'),
        description: zod_1.z.string().optional().describe('Volitelný popis Lookalike Audience'),
        country: zod_1.z.string().length(2).describe('Kód země (ISO 3166-1 alpha-2), pro kterou se má Lookalike vytvořit (např. "US", "CZ")'),
        ratio: zod_1.z.number().min(0.01).max(0.2).optional().describe('Poměr podobnosti (1-20%), např. 0.01 pro 1%. Výchozí je 0.01.')
    }, async ({ sourceAudienceId, name, description, country, ratio }) => {
        const result = await audienceTools.createLookalikeAudience(sourceAudienceId, name, description || '', // Pass empty string if undefined
        country, ratio // Pass ratio, function has default
        );
        // Adjust the response text to include details from result.audienceData
        let lookalikeResponseText = result.success
            ? `Lookalike publikum "${name}" bylo úspěšně vytvořeno (ID: ${result.audienceId}).\n\n`
            : `Chyba při vytváření lookalike publika: ${result.message}`;
        if (result.success && result.audienceData) {
            lookalikeResponseText += `Detaily:\n` +
                `  - Název: ${result.audienceData.name}\n` +
                `  - Popis: ${result.audienceData.description || '-'}\n` +
                `  - Subtyp: ${result.audienceData.subtype}\n` +
                `  - Přibližná velikost: ${result.audienceData.approximateCount || 'N/A'}\n`;
        }
        return {
            content: [{ type: 'text', text: lookalikeResponseText }]
        };
    });
    // --- Registrace nástrojů pro Ad Sets ---
    server.tool('create_ad_set', {
        campaignId: zod_1.z.string().describe('ID kampaně, pod kterou sada patří'),
        name: zod_1.z.string().describe('Název reklamní sady'),
        status: zod_1.z.string().describe('Status sady (ACTIVE, PAUSED, ARCHIVED)'),
        targeting: zod_1.z.any().describe('Specifikace cílení (komplexní objekt, viz FB dokumentace)'), // Using z.any() for complex targeting
        optimizationGoal: zod_1.z.string().describe('Cíl optimalizace (např. REACH, OFFSITE_CONVERSIONS)'),
        billingEvent: zod_1.z.string().describe('Událost pro účtování (např. IMPRESSIONS, LINK_CLICKS)'),
        bidAmount: zod_1.z.number().int().positive().optional().describe('Nabídka v centech (volitelné)'),
        dailyBudget: zod_1.z.number().int().positive().optional().describe('Denní rozpočet v centech (volitelné). U CBO účtů (rozpočet na úrovni kampaně) NEUVÁDĚT – dědí se z kampaně.'),
        lifetimeBudget: zod_1.z.number().int().positive().optional().describe('Celoživotní rozpočet v centech (volitelné). U CBO účtů NEUVÁDĚT.'),
        startTime: zod_1.z.string().datetime({ offset: true }).optional().describe('Čas začátku (ISO 8601, volitelné)'),
        endTime: zod_1.z.string().datetime({ offset: true }).optional().describe('Čas konce (ISO 8601, volitelné)'),
        promotedObject: zod_1.z.any().optional().describe('Lead kampaně (OUTCOME_LEADS) → API promoted_object. Web konverze: { pixel_id, custom_event_type:"LEAD" } nebo { pixel_id, custom_conversion_id }. Instant formulář: { page_id }.'),
        destinationType: zod_1.z.enum(['WEBSITE', 'ON_AD', 'MESSENGER', 'PHONE_CALL', 'INSTAGRAM_DIRECT']).optional().describe('Lead kampaně → API destination_type. Web konverze: WEBSITE. Instant formulář: ON_AD.'),
        dsaBeneficiary: zod_1.z.string().optional().describe('EU DSA: jméno osoby/organizace, kterou reklama propaguje (kdo z ní těží). POVINNÉ u cílení na EU – jinak chyba 100/3858081. Zobrazuje se veřejně v Knihovně reklam.'),
        dsaPayor: zod_1.z.string().optional().describe('EU DSA: kdo reklamu platí. Volitelné – když se neuvede, použije se stejná hodnota jako dsaBeneficiary.')
    }, async (params) => {
        // Některé klienty posílají objektové parametry jako JSON string – zparsuj je,
        // ať vnořená validace (promotedObject.pixel_id) i propsání do API fungují.
        const parseIfString = (v, label) => {
            if (typeof v !== 'string')
                return v;
            try {
                return JSON.parse(v);
            }
            catch {
                throw new Error(`Parametr ${label} přišel jako neplatný JSON string: ${v}`);
            }
        };
        params.promotedObject = parseIfString(params.promotedObject, 'promotedObject');
        params.targeting = parseIfString(params.targeting, 'targeting');
        // Rozpočet: nesmí být oba zároveň. Žádný rozpočet je OK (CBO – dědí z kampaně).
        if (params.dailyBudget && params.lifetimeBudget) {
            throw new Error('Nelze nastavit současně denní i celoživotní rozpočet.');
        }
        // Doporučená validace pro lead kampaně, ať to nepadá obecným „Invalid parameter".
        const og = params.optimizationGoal;
        const po = params.promotedObject;
        if (og === 'OFFSITE_CONVERSIONS') {
            if (!po?.pixel_id) {
                throw new Error('Pro optimization_goal=OFFSITE_CONVERSIONS je vyžadováno promotedObject.pixel_id (+ custom_event_type nebo custom_conversion_id).');
            }
            if (!po.custom_event_type && !po.custom_conversion_id) {
                throw new Error('promotedObject u OFFSITE_CONVERSIONS vyžaduje custom_event_type (např. "LEAD") nebo custom_conversion_id.');
            }
            if (params.destinationType && params.destinationType !== 'WEBSITE') {
                throw new Error('Pro OFFSITE_CONVERSIONS (web konverze) musí být destinationType=WEBSITE.');
            }
            if (!params.destinationType)
                params.destinationType = 'WEBSITE';
        }
        if (og === 'LEAD_GENERATION' || og === 'QUALITY_LEAD') {
            if (!po?.page_id) {
                throw new Error(`Pro optimization_goal=${og} (instant formulář) je vyžadováno promotedObject.page_id.`);
            }
            if (params.destinationType && params.destinationType !== 'ON_AD') {
                throw new Error(`Pro ${og} (instant formulář) musí být destinationType=ON_AD.`);
            }
            if (!params.destinationType)
                params.destinationType = 'ON_AD';
        }
        const result = await adSetTools.createAdSet(params.campaignId, params.name, params.status, params.targeting, params.optimizationGoal, params.billingEvent, params.bidAmount, params.dailyBudget, params.lifetimeBudget, params.startTime, params.endTime, params.promotedObject, params.destinationType, params.dsaBeneficiary, params.dsaPayor);
        // Adjust the response text to potentially include more details from result.adSetData
        let responseText = result.success
            ? `Reklamní sada "${params.name}" byla úspěšně vytvořena (ID: ${result.adSetId}).\n\n`
            : result.message;
        if (result.success && result.adSetData) {
            responseText += `Detaily:\n` +
                `  - Status: ${result.adSetData.status}\n` +
                `  - Optimalizace: ${result.adSetData.optimizationGoal}\n` +
                `  - Účtování: ${result.adSetData.billingEvent}\n` +
                (result.adSetData.destinationType ? `  - Cíl (destination_type): ${result.adSetData.destinationType}\n` : '') +
                (result.adSetData.promotedObject ? `  - Promoted object: ${JSON.stringify(result.adSetData.promotedObject)}\n` : '') +
                (result.adSetData.dailyBudget ? `  - Denní rozpočet: ${result.adSetData.dailyBudget}\n` : '') +
                (result.adSetData.lifetimeBudget ? `  - Celoživotní rozpočet: ${result.adSetData.lifetimeBudget}\n` : '') +
                (result.adSetData.startTime ? `  - Začátek: ${new Date(result.adSetData.startTime).toLocaleString()}\n` : '') +
                (result.adSetData.endTime ? `  - Konec: ${new Date(result.adSetData.endTime).toLocaleString()}\n` : '');
        }
        return {
            content: [{ type: 'text', text: responseText }]
        };
    });
    server.tool('update_adset', {
        adSetId: zod_1.z.string().describe('ID reklamní sady (ad set)'),
        name: zod_1.z.string().optional().describe('Nový název'),
        status: zod_1.z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional().describe('Nový status (ACTIVE = spustit, PAUSED = pozastavit, ARCHIVED = archivovat)')
    }, async ({ adSetId, name, status }) => {
        if (!name && !status) {
            throw new Error('Musí být zadán alespoň jeden parametr k úpravě (name nebo status).');
        }
        const r = await adSetTools.updateAdSet(adSetId, { name, status });
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    // --- Registrace nástrojů pro reklamy (Ads), kreativy a média ---
    server.tool('upload_ad_media', {
        file_path: zod_1.z.string().describe('Absolutní cesta k souboru – obrázek (jpg/png/gif) nebo video (mp4/mov)'),
        description: zod_1.z.string().optional().describe('Volitelný popis videa')
    }, async ({ file_path, description }) => {
        const r = await adTools.uploadAdMedia(file_path, description);
        const hint = r.success
            ? (r.type === 'image' ? '\n(image_hash použij v object_story_spec)' : '\n(video_id použij v object_story_spec)')
            : '';
        return { content: [{ type: 'text', text: (r.success ? r.message : `Chyba: ${r.message}`) + hint }] };
    });
    server.tool('create_adcreative', {
        name: zod_1.z.string().describe('Název kreativy'),
        object_story_spec: zod_1.z.any().describe('Specifikace kreativy: page_id + link_data/video_data s image_hash/video_id. '
            + 'Instant formulář (Cesta B): video_data/link_data s call_to_action { type:"SIGN_UP", value:{ lead_gen_form_id:"<FORM_ID>" } }. '
            + 'Web konverze (Cesta A): call_to_action { type:"LEARN_MORE", value:{ link:"https://www.svobodne-reality.cz" } } '
            + '(+ u video_data doplň link_description; u čistě video příspěvku je CTA s link nutné pro proklik na web).')
    }, async ({ name, object_story_spec }) => {
        const r = await adTools.createAdCreative(name, object_story_spec);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('create_ad', {
        adset_id: zod_1.z.string().describe('ID reklamní sady (ad set)'),
        name: zod_1.z.string().describe('Název reklamy'),
        creative_id: zod_1.z.string().describe('ID kreativy (z create_adcreative)'),
        status: zod_1.z.string().optional().describe('Status ACTIVE/PAUSED. Výchozí PAUSED – bez potvrzení uživatele nespouštět.')
    }, async ({ adset_id, name, creative_id, status }) => {
        const r = await adTools.createAd(adset_id, name, creative_id, status || 'PAUSED');
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('update_ad', {
        ad_id: zod_1.z.string().describe('ID reklamy'),
        name: zod_1.z.string().optional().describe('Nový název'),
        status: zod_1.z.string().optional().describe('Nový status (ACTIVE/PAUSED/ARCHIVED)'),
        creative_id: zod_1.z.string().optional().describe('Nové ID kreativy')
    }, async ({ ad_id, name, status, creative_id }) => {
        const r = await adTools.updateAd(ad_id, { name, status, creativeId: creative_id });
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('delete_ad', {
        ad_id: zod_1.z.string().describe('ID reklamy – mazání je nevratné, jen po potvrzení')
    }, async ({ ad_id }) => {
        const r = await adTools.deleteAd(ad_id);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('get_ad', {
        ad_id: zod_1.z.string().describe('ID reklamy – vrátí i kreativu: cílový odkaz, CTA, text, video/obrázek (pro ověření změn)')
    }, async ({ ad_id }) => {
        const r = await adTools.getAd(ad_id);
        if (!r.success || !r.ad)
            return { content: [{ type: 'text', text: `Chyba: ${r.message}` }] };
        const a = r.ad;
        const lines = [
            `Reklama ${a.id} – "${a.name}"`,
            `  Status: ${a.status} (effective: ${a.effectiveStatus})`,
            `  Ad set: ${a.adSetId} | Kampaň: ${a.campaignId}`,
            `  Kreativa: ${a.creativeId}${a.creativeName ? ` ("${a.creativeName}")` : ''}`,
            a.link ? `  Cílový odkaz: ${a.link}` : null,
            a.ctaType ? `  CTA: ${a.ctaType}${a.ctaLink ? ` → ${a.ctaLink}` : ''}` : null,
            a.leadFormId ? `  Lead formulář: ${a.leadFormId}` : null,
            a.title ? `  Titulek: ${a.title}` : null,
            a.message ? `  Text: ${a.message}` : null,
            a.videoId ? `  Video ID: ${a.videoId}` : null,
            a.imageHash ? `  Image hash: ${a.imageHash}` : null,
            a.effectiveObjectStoryId ? `  Post (object_story_id): ${a.effectiveObjectStoryId}` : null,
        ].filter(Boolean);
        return { content: [{ type: 'text', text: lines.join('\n') }] };
    });
    // --- Registrace nástrojů pro lead formuláře (instant formuláře) a pixely ---
    server.tool('create_lead_form', {
        name: zod_1.z.string().describe('Název lead formuláře'),
        privacy_policy: zod_1.z.object({
            url: zod_1.z.string().describe('URL zásad ochrany osobních údajů (povinné – Meta vyžaduje)'),
            link_text: zod_1.z.string().describe('Text odkazu na zásady (např. "Zásady ochrany osobních údajů")')
        }).describe('Odkaz na zásady ochrany osobních údajů – Meta vyžaduje URL.'),
        page_id: zod_1.z.string().optional().describe('ID stránky (volitelné – výchozí je aktivní připojená stránka)'),
        locale: zod_1.z.string().optional().describe('Jazyk formuláře (výchozí CS_CZ)'),
        questions: zod_1.z.array(zod_1.z.any()).optional().describe('Pole otázek, např. [{"type":"FULL_NAME"},{"type":"EMAIL"},{"type":"PHONE"}]. Vlastní: {"type":"CUSTOM","label":"Typ nemovitosti","options":[...]}. Výchozí: jméno+email+telefon.'),
        context_card: zod_1.z.any().optional().describe('Úvodní karta (nadpis + popis + tlačítko) – volitelné'),
        thank_you_page: zod_1.z.any().optional().describe('Děkovací stránka (text + odkaz na web) – volitelné'),
        follow_up_action_url: zod_1.z.string().optional().describe('URL webu pro navazující akci – volitelné')
    }, async (p) => {
        const r = await leadFormTools.createLeadForm({
            name: p.name,
            privacyPolicy: p.privacy_policy,
            pageId: p.page_id,
            locale: p.locale,
            questions: p.questions,
            contextCard: p.context_card,
            thankYouPage: p.thank_you_page,
            followUpActionUrl: p.follow_up_action_url,
        });
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('get_lead_forms', {
        page_id: zod_1.z.string().optional().describe('ID stránky (volitelné – výchozí je aktivní připojená stránka)')
    }, async ({ page_id }) => {
        const r = await leadFormTools.getLeadForms(page_id);
        if (!r.success)
            return { content: [{ type: 'text', text: `Chyba: ${r.message}` }] };
        const list = (r.forms || []).map((f) => `  - ${f.name} (ID: ${f.id}, status: ${f.status}, leadů: ${f.leads_count})`).join('\n');
        return { content: [{ type: 'text', text: `${r.message}\n${list}` }] };
    });
    server.tool('get_pixels', {}, async () => {
        const r = await leadFormTools.getPixels();
        if (!r.success)
            return { content: [{ type: 'text', text: `Chyba: ${r.message}` }] };
        const list = (r.pixels || []).map((px) => `  - ${px.name} (Pixel ID: ${px.id})`).join('\n');
        return { content: [{ type: 'text', text: `${r.message}\n${list}` }] };
    });
    // --- Targeting research (zájmy, chování, lokality, odhad publika) ---
    const listText = (r, mapFn) => r.success ? `${r.message}\n` + (r.items || []).map(mapFn).join('\n') : `Chyba: ${r.message}`;
    server.tool('search_interests', {
        query: zod_1.z.string().describe('Hledaný výraz (např. "reality", "bydlení")'),
        limit: zod_1.z.number().int().positive().optional().describe('Max výsledků (výchozí 25)')
    }, async ({ query, limit }) => {
        const r = await targetingTools.searchInterests(query, limit ?? 25);
        return { content: [{ type: 'text', text: listText(r, (i) => `  - ${i.name} (id: ${i.id}, publikum: ${i.audience})${i.path ? ` [${i.path}]` : ''}`) }] };
    });
    server.tool('get_interest_suggestions', {
        interest_names: zod_1.z.array(zod_1.z.string()).describe('Názvy zájmů, ke kterým chceš návrhy podobných (např. ["Real estate"])'),
        limit: zod_1.z.number().int().positive().optional().describe('Max výsledků (výchozí 25)')
    }, async ({ interest_names, limit }) => {
        const r = await targetingTools.getInterestSuggestions(interest_names, limit ?? 25);
        return { content: [{ type: 'text', text: listText(r, (i) => `  - ${i.name} (id: ${i.id}, publikum: ${i.audience})`) }] };
    });
    server.tool('search_behaviors', {
        limit: zod_1.z.number().int().positive().optional().describe('Max výsledků (výchozí 50)')
    }, async ({ limit }) => {
        const r = await targetingTools.searchBehaviors(limit ?? 50);
        return { content: [{ type: 'text', text: listText(r, (b) => `  - ${b.name} (id: ${b.id}, publikum: ${b.audience})${b.description ? ` – ${b.description}` : ''}`) }] };
    });
    server.tool('search_geo_locations', {
        query: zod_1.z.string().describe('Hledaná lokalita (např. "Ostrava", "Moravskoslezský")'),
        location_types: zod_1.z.array(zod_1.z.string()).optional().describe('Filtr typů: country, region, city, zip, geo_market (výchozí vše)'),
        country_code: zod_1.z.string().optional().describe('Omezit na zemi (např. "CZ")'),
        limit: zod_1.z.number().int().positive().optional().describe('Max výsledků (výchozí 25)')
    }, async ({ query, location_types, country_code, limit }) => {
        const r = await targetingTools.searchGeoLocations(query, location_types, country_code, limit ?? 25);
        return { content: [{ type: 'text', text: listText(r, (g) => `  - ${g.name} (${g.type}, key: ${g.key})${g.region ? ` – ${g.region}` : ''}${g.countryCode ? `, ${g.countryCode}` : ''}`) }] };
    });
    server.tool('estimate_audience_size', {
        targeting: zod_1.z.any().describe('Targeting spec (objekt jako u create_ad_set, např. { geo_locations: {...}, age_min, age_max })'),
        optimization_goal: zod_1.z.string().optional().describe('Cíl optimalizace pro odhad (výchozí REACH; např. OFFSITE_CONVERSIONS, LEAD_GENERATION)')
    }, async ({ targeting, optimization_goal }) => {
        const r = await targetingTools.estimateAudienceSize(targeting, optimization_goal ?? 'REACH');
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    // --- Správa pixelů ---
    server.tool('create_pixel', {
        name: zod_1.z.string().describe('Název nového pixelu')
    }, async ({ name }) => {
        const r = await pixelTools.createPixel(name);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('update_pixel', {
        pixel_id: zod_1.z.string().describe('ID pixelu'),
        name: zod_1.z.string().describe('Nový název pixelu')
    }, async ({ pixel_id, name }) => {
        const r = await pixelTools.updatePixel(pixel_id, name);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('get_pixel', {
        pixel_id: zod_1.z.string().describe('ID pixelu (detail vč. last_fired_time – kdy naposledy vystřelil event)')
    }, async ({ pixel_id }) => {
        const r = await pixelTools.getPixel(pixel_id);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('get_pixel_stats', {
        pixel_id: zod_1.z.string().describe('ID pixelu'),
        aggregation: zod_1.z.string().optional().describe('Agregace: event (výchozí), device_type, host, url, browser_type, pixel_fire')
    }, async ({ pixel_id, aggregation }) => {
        const r = await pixelTools.getPixelStats(pixel_id, aggregation ?? 'event');
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    // --- Conversions API (server-side eventy) ---
    server.tool('send_conversion_event', {
        pixel_id: zod_1.z.string().describe('ID pixelu'),
        event_name: zod_1.z.string().describe('Název události (Lead, Purchase, CompleteRegistration, vlastní…)'),
        user_data: zod_1.z.any().describe('Identifikátory uživatele: { em, ph, client_ip_address, client_user_agent, fbp, fbc, external_id… }. Email/telefon se automaticky hashují SHA-256.'),
        event_time: zod_1.z.number().int().optional().describe('Unix timestamp události (výchozí teď)'),
        event_id: zod_1.z.string().optional().describe('ID pro deduplikaci s browser pixelem (doporučeno)'),
        event_source_url: zod_1.z.string().optional().describe('URL stránky, kde událost nastala'),
        action_source: zod_1.z.string().optional().describe('Zdroj: website (výchozí), phone_call, email, crm, other…'),
        custom_data: zod_1.z.any().optional().describe('Doplňková data: { value, currency, content_name… }'),
        test_event_code: zod_1.z.string().optional().describe('Test Event Code z Events Manageru – event se zobrazí jen v test nástroji')
    }, async (p) => {
        const r = await conversionTools.sendConversionEvent({
            pixelId: p.pixel_id, eventName: p.event_name, userData: p.user_data,
            eventTime: p.event_time, eventId: p.event_id, eventSourceUrl: p.event_source_url,
            actionSource: p.action_source, customData: p.custom_data, testEventCode: p.test_event_code,
        });
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('send_conversion_events_batch', {
        pixel_id: zod_1.z.string().describe('ID pixelu'),
        events: zod_1.z.any().describe('Pole CAPI eventů dle schématu (event_name, event_time, user_data…). PII se hashuje automaticky.'),
        test_event_code: zod_1.z.string().optional().describe('Test Event Code (volitelné)')
    }, async ({ pixel_id, events, test_event_code }) => {
        const r = await conversionTools.sendConversionEventsBatch(pixel_id, events, test_event_code);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    // --- Vlastní konverze ---
    server.tool('get_custom_conversions', {}, async () => {
        const r = await conversionTools.listCustomConversions();
        return { content: [{ type: 'text', text: listText(r, (c) => `  - ${c.name} (ID: ${c.id}, event: ${c.eventType || 'rule'}, pixel: ${c.pixelId || '—'}${c.archived ? ', ARCHIVOVANÁ' : ''})`) }] };
    });
    server.tool('get_custom_conversion', {
        conversion_id: zod_1.z.string().describe('ID vlastní konverze')
    }, async ({ conversion_id }) => {
        const r = await conversionTools.getCustomConversion(conversion_id);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('create_custom_conversion', {
        name: zod_1.z.string().describe('Název konverze'),
        pixel_id: zod_1.z.string().describe('ID pixelu (event source)'),
        custom_event_type: zod_1.z.string().optional().describe('Standardní událost (LEAD, PURCHASE, COMPLETE_REGISTRATION…) – NEBO použij rule'),
        rule: zod_1.z.any().optional().describe('Pravidlo (JSON), např. {"and":[{"event":{"eq":"PageView"}},{"URL":{"i_contains":"/dekujeme"}}]}'),
        default_conversion_value: zod_1.z.number().optional().describe('Výchozí hodnota konverze (volitelné)')
    }, async (p) => {
        const r = await conversionTools.createCustomConversion({
            name: p.name, pixelId: p.pixel_id, customEventType: p.custom_event_type,
            rule: p.rule, defaultConversionValue: p.default_conversion_value,
        });
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('update_custom_conversion', {
        conversion_id: zod_1.z.string().describe('ID vlastní konverze'),
        name: zod_1.z.string().optional().describe('Nový název'),
        default_conversion_value: zod_1.z.number().optional().describe('Nová výchozí hodnota')
    }, async ({ conversion_id, name, default_conversion_value }) => {
        const r = await conversionTools.updateCustomConversion(conversion_id, { name, defaultConversionValue: default_conversion_value });
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('delete_custom_conversion', {
        conversion_id: zod_1.z.string().describe('ID vlastní konverze – mazání je nevratné, jen po potvrzení')
    }, async ({ conversion_id }) => {
        const r = await conversionTools.deleteCustomConversion(conversion_id);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    // --- Offline konverze ---
    server.tool('get_offline_conversion_sets', {}, async () => {
        const r = await conversionTools.listOfflineConversionSets();
        return { content: [{ type: 'text', text: listText(r, (s) => `  - ${s.name} (ID: ${s.id}${s.validEntries != null ? `, záznamů: ${s.validEntries}, spárováno: ${s.matchedEntries}` : ''})`) }] };
    });
    server.tool('create_offline_conversion_set', {
        name: zod_1.z.string().describe('Název offline event setu'),
        description: zod_1.z.string().optional().describe('Popis (volitelné)'),
        business_id: zod_1.z.string().optional().describe('Business ID (výchozí z env FACEBOOK_BUSINESS_ID)')
    }, async ({ name, description, business_id }) => {
        const r = await conversionTools.createOfflineConversionSet(name, description, business_id);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    server.tool('upload_offline_conversions', {
        set_id: zod_1.z.string().describe('ID offline event setu'),
        upload_tag: zod_1.z.string().describe('Označení dávky (např. "leady-cerven-2026")'),
        data: zod_1.z.any().describe('Pole eventů: [{ match_keys: { em, ph… }, event_time (unix), event_name, value?, currency? }]. PII se hashuje automaticky.')
    }, async ({ set_id, upload_tag, data }) => {
        const r = await conversionTools.uploadOfflineConversions(set_id, upload_tag, data);
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    // --- Úprava kreativy (jen name/status – obsah je immutable) ---
    server.tool('update_adcreative', {
        creative_id: zod_1.z.string().describe('ID kreativy'),
        name: zod_1.z.string().optional().describe('Nový název'),
        status: zod_1.z.string().optional().describe('Nový status (ACTIVE/DELETED). Pozn.: obsah kreativy změnit nejde – vytvoř novou přes create_adcreative.')
    }, async ({ creative_id, name, status }) => {
        const r = await adTools.updateAdCreative(creative_id, { name, status });
        return { content: [{ type: 'text', text: r.success ? r.message : `Chyba: ${r.message}` }] };
    });
    // --- Registrace nástrojů pro správu příspěvků ---
    server.tool('create_video_post', {
        file_path: zod_1.z.string().describe('Absolutní cesta k video souboru (mp4/mov)'),
        message: zod_1.z.string().describe('Text příspěvku (popis videa na stránce)'),
        published: zod_1.z.boolean().optional().describe('Publikovat ihned? Výchozí false = nahraje jako NEPUBLIKOVANÉ ke kontrole a ruční publikaci.')
    }, async ({ file_path, message, published }) => {
        try {
            const r = await postTools.create_video_post(file_path, message, published ?? false);
            const stav = r.published
                ? 'PUBLIKOVÁNO na stránce'
                : 'NEPUBLIKOVÁNO – zkontroluj a publikuj ve Business Suite / na stránce';
            return { content: [{ type: 'text', text: `Video nahráno na stránku. video_id: ${r.videoId}, stav: ${stav}` }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `Chyba: ${e?.message || 'neznámá chyba'}` }] };
        }
    });
    server.tool('create_post', {
        content: zod_1.z.string().describe('Obsah příspěvku'),
        link: zod_1.z.string().optional().describe('Volitelný odkaz, který bude součástí příspěvku'),
        imagePath: zod_1.z.string().optional().describe('Volitelná cesta k obrázku, který bude součástí příspěvku')
    }, async ({ content, link, imagePath }) => {
        // Assuming create_post returns a simple string ID or throws an error
        try {
            const postId = await postTools.create_post(content, link, imagePath);
            let responseText = `✅ Příspěvek byl úspěšně vytvořen (ID: ${postId}).`;
            if (link) {
                responseText += `\n- Odkaz: ${link}`;
            }
            if (imagePath) {
                responseText += `\n- Obrázek: ${imagePath}`;
            }
            return {
                content: [{ type: 'text', text: responseText }]
            };
        }
        catch (error) {
            console.error(`Chyba při vytváření příspěvku:`, error);
            return { content: [{ type: 'text', text: `❌ Chyba při vytváření příspěvku: ${error.message}` }], isError: true };
        }
    });
    // --- Připojení Facebook účtu přes OAuth okno. Vyžaduje nastavenou aplikaci;
    //     pokud nejde, použij set_facebook_token (token z Graph API Exploreru). ---
    server.tool('connect_facebook_account', 'Přihlásí Facebook účet přes OAuth okno v prohlížeči; po přihlášení si MCP sám načte tokeny stránek a ID reklamních účtů. Když to selže (chyba o doménách aplikace), použij raději set_facebook_token.', {}, async () => {
        const { appId, source } = (0, auth_manager_js_1.getAppCredentials)();
        const url = (0, auth_manager_js_1.getOAuthDialogUrl)(appId);
        const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        (0, child_process_1.exec)(cmd + ' "' + url + '"');
        const appNote = source === 'builtin' ? ' (vestavěná sdílená Facebook aplikace)' : '';
        return { content: [{ type: 'text', text: 'Otevírám přihlášení k Facebooku v prohlížeči' + appNote + '.\n' +
                        'Pokud se okno neotevřelo, jdi ručně na: ' + (0, auth_manager_js_1.getAuthLoginUrl)() + '\n\n' +
                        'Po dokončení přihlášení si MCP sám uloží tokeny a propojené účty – pak řekni: „Zobraz propojené účty". Restart není potřeba.\n\n' +
                        '⚠️ Pokud Facebook hlásí „URL se nedá načíst / Doména této adresy URL není součástí domén aplikací" nebo podobnou chybu:\n' +
                        'NEJSNAZŠÍ řešení (nevyžaduje nastavení aplikace) – vygeneruj si token v Graph API Exploreru\n' +
                        '(https://developers.facebook.com/tools/explorer/) s oprávněními ads_management, ads_read, pages_show_list,\n' +
                        'pages_read_engagement, pages_manage_posts, pages_manage_ads, business_management, zkopíruj ho a tady řekni:\n' +
                        '„Nastav Facebook token: EAA..." (nástroj set_facebook_token). Celý návod: nástroj facebook_setup_help.' }] };
    });
    server.tool('set_facebook_token', 'Uloží Facebook user access token získaný z Graph API Exploreru a sám si dotáhne propojené stránky i reklamní účty. Spolehlivá alternativa k connect_facebook_account, když nejde OAuth přihlášení.', {
        token: zod_1.z.string().describe('User access token z https://developers.facebook.com/tools/explorer/ (dlouhý řetězec začínající "EAA...")'),
    }, async ({ token }) => {
        try {
            const { appId, appSecret } = (0, auth_manager_js_1.getAppCredentials)();
            const { pages, adAccounts, longLived } = await (0, auth_manager_js_1.setUserToken)(appId, appSecret, token);
            let text = '✅ Token uložen a ověřen. ';
            text += longLived
                ? 'Platnost prodloužena na ~60 dní (poté se obnoví automaticky při startu).'
                : '⚠️ Token zůstal krátkodobý (pár hodin). Aby šel prodloužit na 60 dní, vyber v Graph API Exploreru stejnou aplikaci, jejíž App ID/Secret má MCP.';
            text += '\n\nPropojené stránky (' + pages.length + '):\n' + (pages.length ? pages.map(p => '  • ' + p).join('\n') : '  (žádné)');
            text += '\n\nReklamní účty (' + adAccounts.length + '):\n' + (adAccounts.length ? adAccounts.map(a => '  • ' + a).join('\n') : '  (žádné)');
            text += '\n\nHotovo – můžeš rovnou pracovat (restart není potřeba). Výchozí účet/stránku změníš nástrojem set_active_account.';
            return { content: [{ type: 'text', text }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: '❌ Token se nepodařilo ověřit: ' + e.message + '\n' +
                            'Zkontroluj, že jsi zkopíroval CELÝ token (začíná "EAA...", je velmi dlouhý) a že má potřebná oprávnění.\n' +
                            'Návod, jak token získat: nástroj facebook_setup_help.' }], isError: true };
        }
    });
    server.tool('facebook_setup_help', 'Vypíše krok-za-krokem návod, jak připojit Facebook (získat token z Graph API Exploreru, případně nastavit aplikaci pro OAuth).', {}, async () => ({ content: [{ type: 'text', text: FB_APP_SETUP_GUIDE }] }));
    server.tool('list_connected_accounts', 'Vypíše propojené Facebook stránky a reklamní účty (a které jsou aktivní).', {}, async () => {
        const pages = (0, auth_manager_js_1.listConnectedPages)();
        const accs = (0, auth_manager_js_1.listConnectedAdAccounts)();
        const tokens = (0, auth_manager_js_1.loadTokens)();
        if (pages.length === 0 && accs.length === 0) {
            return { content: [{ type: 'text', text: 'Žádné propojené účty. V Claude řekni: „Připoj Facebook účet".' }] };
        }
        let text = '';
        if (tokens._user?.expires) {
            const left = Math.max(0, Math.round((tokens._user.expires - Date.now()) / (24 * 3600 * 1000)));
            text += 'Přihlášen (token platný ještě ~' + left + ' dní, obnoví se automaticky).\n\n';
        }
        text += 'Stránky (' + pages.length + '):\n';
        pages.forEach((p, i) => {
            text += '  ' + (i + 1) + '. ' + p.name + ' (ID: ' + p.id + ')' + (p.category ? ' – ' + p.category : '') + (p.active ? '  ← aktivní' : '') + '\n';
        });
        text += '\nReklamní účty (' + accs.length + '):\n';
        accs.forEach((a, i) => {
            text += '  ' + (i + 1) + '. ' + a.name + ' (' + a.id + ', ' + a.currency + ')' + (a.active ? '  ← aktivní' : '') + '\n';
        });
        text += '\nVýchozí účet/stránku změníš nástrojem set_active_account.';
        return { content: [{ type: 'text', text }] };
    });
    server.tool('set_active_account', 'Nastaví výchozí (aktivní) Facebook stránku a/nebo reklamní účet, který se použije pro další operace.', {
        pageId: zod_1.z.string().optional().describe('ID Facebook stránky (volitelné). Musí být mezi propojenými.'),
        adAccountId: zod_1.z.string().optional().describe('ID reklamního účtu, např. "act_123..." (volitelné). Musí být mezi propojenými.'),
    }, async ({ pageId, adAccountId }) => {
        if (!pageId && !adAccountId) {
            return { content: [{ type: 'text', text: 'Zadej alespoň pageId nebo adAccountId. Seznam zobrazíš nástrojem list_connected_accounts.' }] };
        }
        try {
            const active = (0, auth_manager_js_1.setActiveSelection)({ pageId, adAccountId });
            return { content: [{ type: 'text', text: 'Aktivní stránka: ' + (active.pageId || '—') + '\nAktivní reklamní účet: ' + (active.adAccountId || '—') }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: '❌ ' + e.message }], isError: true };
        }
    });
    return server; // Return the created server instance
};
// Hlavní funkce pro spuštění serveru
const startServer = async () => {
    try {
        // App credentials: fb-config.json > env > vestavěná sdílená aplikace.
        const { appId, appSecret, source } = (0, auth_manager_js_1.getAppCredentials)();
        process.stderr.write('[Facebook MCP] Facebook app: ' + appId + ' (' + source + ')\n');
        // Auto-refresh dlouhého tokenu (pokud se blíží expirace) – ještě před inicializací SDK.
        await (0, auth_manager_js_1.refreshUserTokenIfNeeded)(appId, appSecret);
        const server = await initializeServer(); // Directly get the server instance
        // Create transport here
        const transport = new stdio_js_1.StdioServerTransport();
        // Handle graceful shutdown
        const shutdown = async () => {
            process.exit(0);
        };
        process.on('SIGINT', shutdown); // Ctrl+C
        process.on('SIGTERM', shutdown); // Terminate signal
        // OAuth callback server na pozadí (neblokuje stdio) – obsluhuje přihlášení.
        (0, auth_manager_js_1.startAuthServer)(appId, appSecret);
        await server.connect(transport);
    }
    catch (error) {
        // Log critical errors to stderr so they don't interfere with stdout MCP messages
        console.error(`❌ Kritická chyba při startu serveru: ${error instanceof Error ? error.stack : error}`);
        process.exit(1);
    }
};
// Spuštění serveru
startServer();
//# sourceMappingURL=index.js.map