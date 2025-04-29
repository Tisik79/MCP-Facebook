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
const campaignTools = __importStar(require("./tools/campaign-tools.js"));
const audienceTools = __importStar(require("./tools/audience-tools.js"));
const analyticsTools = __importStar(require("./tools/analytics-tools.js"));
const adSetTools = __importStar(require("./tools/adset-tools.js")); // Import new adset tools
const postTools = __importStar(require("./tools/post-tools.js")); // Import post tools
const campaign_templates_js_1 = require("./prompts/campaign-templates.js");
// Funkce pro inicializaci serveru
const initializeServer = async () => {
    // Kontrola konfigurace
    if (!(0, config_js_1.validateConfig)()) {
        console.error('Neplatná konfigurace. Zkontrolujte .env soubor nebo proměnné prostředí.');
        throw new Error('Neplatná konfigurace. Zkontrolujte .env soubor nebo proměnné prostředí.');
    }
    // Inicializace Facebook SDK
    try {
        (0, config_js_1.initFacebookSdk)();
        // console.log('Facebook SDK inicializováno.'); // Removed console log
    }
    catch (error) {
        // console.error('Chyba při inicializaci Facebook SDK:', error); // Removed console error
        // Re-throw the error to be caught by the main startServer catch block
        throw new Error(`Chyba při inicializaci Facebook SDK: ${error instanceof Error ? error.message : error}`);
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
        special_ad_categories: zod_1.z.array(zod_1.z.string()).nonempty().describe('Speciální kategorie reklam (POVINNÉ, MUSÍ obsahovat alespoň jednu platnou hodnotu, např. ["HOUSING"], ["EMPLOYMENT"], ["CREDIT"], ["ISSUES_ELECTIONS_POLITICS"])')
    }, 
    // Destructure arguments directly in the handler signature
    async ({ name, objective, status, dailyBudget, startTime, endTime, special_ad_categories }) => {
        const result = await campaignTools.createCampaign(name, objective, status, dailyBudget ? parseFloat(dailyBudget) : undefined, startTime, endTime, special_ad_categories // Pass the new parameter
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
        responseText += `\n- **Rozpočet a finance:**\n`;
        responseText += campaign.dailyBudget ? `  - Denní rozpočet: ${campaign.dailyBudget}\n` : '';
        responseText += campaign.lifetimeBudget ? `  - Celoživotní rozpočet: ${campaign.lifetimeBudget}\n` : '';
        responseText += campaign.spendCap ? `  - Limit výdajů: ${campaign.spendCap}\n` : '';
        responseText += campaign.budgetRemaining ? `  - Zbývající rozpočet: ${campaign.budgetRemaining}\n` : '';
        if (!campaign.dailyBudget && !campaign.lifetimeBudget && !campaign.spendCap && !campaign.budgetRemaining) {
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
        endTime: zod_1.z.string().optional().describe('Nový čas konce kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)')
    }, async ({ campaignId, name, status, dailyBudget, endTime }) => {
        // Check if at least one updateable field is provided
        if (!name && !status && !dailyBudget && !endTime) {
            // Throw standard Error or handle appropriately, McpError might not be available
            throw new Error('Musí být poskytnut alespoň jeden parametr k aktualizaci (name, status, dailyBudget, endTime).');
        }
        const result = await campaignTools.updateCampaign(campaignId, name, status, dailyBudget ? parseFloat(dailyBudget) : undefined, endTime);
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
        dailyBudget: zod_1.z.number().int().positive().optional().describe('Denní rozpočet v centech (volitelné)'),
        lifetimeBudget: zod_1.z.number().int().positive().optional().describe('Celoživotní rozpočet v centech (volitelné)'),
        startTime: zod_1.z.string().datetime({ offset: true }).optional().describe('Čas začátku (ISO 8601, volitelné)'),
        endTime: zod_1.z.string().datetime({ offset: true }).optional().describe('Čas konce (ISO 8601, volitelné)')
    }, async (params) => {
        // Basic validation for budget (either daily or lifetime must be set)
        if (!params.dailyBudget && !params.lifetimeBudget) {
            throw new Error('Musí být nastaven alespoň denní nebo celoživotní rozpočet.');
        }
        if (params.dailyBudget && params.lifetimeBudget) {
            throw new Error('Nelze nastavit současně denní i celoživotní rozpočet.');
        }
        const result = await adSetTools.createAdSet(params.campaignId, params.name, params.status, params.targeting, params.optimizationGoal, params.billingEvent, params.bidAmount, params.dailyBudget, params.lifetimeBudget, params.startTime, params.endTime);
        // Adjust the response text to potentially include more details from result.adSetData
        let responseText = result.success
            ? `Reklamní sada "${params.name}" byla úspěšně vytvořena (ID: ${result.adSetId}).\n\n`
            : `Chyba při vytváření reklamní sady: ${result.message}`;
        if (result.success && result.adSetData) {
            responseText += `Detaily:\n` +
                `  - Status: ${result.adSetData.status}\n` +
                `  - Optimalizace: ${result.adSetData.optimizationGoal}\n` +
                `  - Účtování: ${result.adSetData.billingEvent}\n` +
                (result.adSetData.dailyBudget ? `  - Denní rozpočet: ${result.adSetData.dailyBudget}\n` : '') +
                (result.adSetData.lifetimeBudget ? `  - Celoživotní rozpočet: ${result.adSetData.lifetimeBudget}\n` : '') +
                (result.adSetData.startTime ? `  - Začátek: ${new Date(result.adSetData.startTime).toLocaleString()}\n` : '') +
                (result.adSetData.endTime ? `  - Konec: ${new Date(result.adSetData.endTime).toLocaleString()}\n` : '');
        }
        return {
            content: [{ type: 'text', text: responseText }]
        };
    });
    // TODO: Add tools for getAdSets, getAdSetDetails, updateAdSet, deleteAdSet
    // --- Registrace nástrojů pro AI asistenci ---
    server.tool('generate_campaign_prompt', {
        templateName: zod_1.z.string().describe('Název šablony promptu. Dostupné šablony: ' + Object.keys(campaign_templates_js_1.prompts).join(', ')),
        // Updated description for variables to match expected keys in templates
        variables: zod_1.z.record(zod_1.z.string()).describe('Objekt s proměnnými pro vyplnění šablony. Očekávané klíče závisí na šabloně, např. pro campaignCreation: {"product": "...", "target_audience": "...", "budget": "...", "goal": "..."}')
    }, async ({ templateName, variables }) => {
        try {
            // fillPromptTemplate returns the array of messages directly
            const messages = (0, campaign_templates_js_1.fillPromptTemplate)(templateName, variables);
            // Return the messages array as the content, assuming the client expects this format for prompts
            // Or format it differently if the client expects something else.
            // For now, let's return the raw messages array. MCP spec might need clarification here.
            // A safer approach might be to format it into a single text block if the client strictly expects text.
            // Let's try formatting as text first.
            const formattedPrompt = messages.map(msg => `${msg.role}: ${msg.content.text}`).join('\n\n');
            return { content: [{ type: 'text', text: `📝 Vygenerovaný prompt pro šablonu "${templateName}":\n\n${formattedPrompt}` }] };
        }
        catch (error) {
            console.error(`Chyba při generování promptu '${templateName}':`, error); // Use console.error
            return { content: [{ type: 'text', text: `❌ Chyba při generování promptu: ${error.message}` }], isError: true };
        }
    });
    // --- Registrace nástrojů pro správu příspěvků ---
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
    return server; // Return the created server instance
};
// Hlavní funkce pro spuštění serveru
const startServer = async () => {
    try {
        // console.log('🚀 Inicializace MCP serveru...'); // Removed console log
        const server = await initializeServer(); // Directly get the server instance
        // Create transport here
        const transport = new stdio_js_1.StdioServerTransport();
        // Handle graceful shutdown
        const shutdown = async () => {
            // console.log('🔌 Ukončování serveru...'); // Removed console log
            // No explicit disconnect/stop needed for stdio transport based on examples
            // console.log('✅ Server bude ukončen.'); // Removed console log
            process.exit(0);
        };
        process.on('SIGINT', shutdown); // Ctrl+C
        process.on('SIGTERM', shutdown); // Terminate signal
        // Connect the server to the transport
        await server.connect(transport);
        // console.log('✅ MCP server úspěšně spuštěn a naslouchá na stdio.'); // Removed console log - Client should receive MCP messages only
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