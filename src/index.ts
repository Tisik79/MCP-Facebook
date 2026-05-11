import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// McpError and ErrorCode removed from imports, will rely on standard Error or handle later if needed
import { StdioServerTransport as StdioTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod'; // Import zod for schema definition
import { initFacebookSdk, validateConfig } from './config.js';
import { listConnectedPages } from './auth-manager.js';
import { ensureAuth } from './auth-entry.js';
import { loadConfig } from './setup.js';
import { exec } from 'child_process';
import * as campaignTools from './tools/campaign-tools.js';
import * as audienceTools from './tools/audience-tools.js';
import * as analyticsTools from './tools/analytics-tools.js';
import * as adSetTools from './tools/adset-tools.js'; // Import new adset tools
import * as postTools from './tools/post-tools.js'; // Import post tools


// Funkce pro inicializaci serveru
const initializeServer = async (): Promise<McpServer> => {
  // Kontrola konfigurace
  if (!validateConfig()) {
    console.error('Neplatná konfigurace. Zkontrolujte .env soubor nebo proměnné prostředí.');
    throw new Error('Neplatná konfigurace. Zkontrolujte .env soubor nebo proměnné prostředí.');
  }

  // Inicializace Facebook SDK
  try {
    initFacebookSdk();
    // console.log('Facebook SDK inicializováno.'); // Removed console log
  } catch (error) {
    // console.error('Chyba při inicializaci Facebook SDK:', error); // Removed console error
    // Re-throw the error to be caught by the main startServer catch block
    throw new Error(`Chyba při inicializaci Facebook SDK: ${error instanceof Error ? error.message : error}`);
  }

  // Vytvoření serveru pomocí konstruktoru McpServer
  const server = new McpServer({
    name: 'facebook-ads-mcp-server',
    version: '1.0.0',
  });

  // --- Registrace nástrojů pro správu kampaní ---
  server.tool(
    'create_campaign',
    // Pass the raw shape object directly, not z.object()
    {
      name: z.string().describe('Název kampaně'),
      // Removed duplicated objective, status, dailyBudget lines below
      objective: z.string().describe('Cíl kampaně (POVOLENÉ HODNOTY: OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_APP_PROMOTION)'), // Keep the updated description
      status: z.string().describe('Status kampaně (ACTIVE, PAUSED)'), // Keep one status line
      dailyBudget: z.string().optional().describe('Denní rozpočet v měně účtu (např. "1000.50")'), // Keep one dailyBudget line
      startTime: z.string().optional().describe('Čas začátku kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)'),
      endTime: z.string().optional().describe('Čas konce kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)'),
      // Made special_ad_categories required and non-empty
      special_ad_categories: z.array(z.string()).nonempty().describe('Speciální kategorie reklam (POVINNÉ, MUSÍ obsahovat alespoň jednu platnou hodnotu, např. ["HOUSING"], ["EMPLOYMENT"], ["CREDIT"], ["ISSUES_ELECTIONS_POLITICS"])')
    },
    // Destructure arguments directly in the handler signature
    async ({ name, objective, status, dailyBudget, startTime, endTime, special_ad_categories }) => {
      const result = await campaignTools.createCampaign(
        name,
        objective,
        status,
        dailyBudget ? parseFloat(dailyBudget) : undefined,
        startTime,
        endTime,
        special_ad_categories // Pass the new parameter
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
    }
  );

  server.tool(
    'get_campaigns',
    {
      limit: z.string().optional().describe('Maximální počet kampaní k zobrazení (číslo)'),
      status: z.string().optional().describe('Filtrování podle statusu (ACTIVE, PAUSED, ARCHIVED)')
    },
    async ({ limit, status }) => { // Destructure arguments
      const result = await campaignTools.getCampaigns(
        limit ? parseInt(limit) : undefined,
        status
      );
      if (!result.success) {
        return { content: [{ type: 'text', text: `❌ Chyba při získávání kampaní: ${result.message}` }], isError: true };
      }
      let responseText = `📋 Seznam reklamních kampaní (celkem ${result.campaigns?.length || 0}):\n\n`;
      if (!result.campaigns || result.campaigns.length === 0) {
        responseText += 'Nebyly nalezeny žádné kampaně odpovídající zadaným kritériím.';
      } else {
        result.campaigns.forEach((campaign: any, index: number) => {
          responseText += `${index + 1}. **${campaign.name}** (ID: ${campaign.id})\n`;
          responseText += `   - Cíl: ${campaign.objective || 'N/A'}\n`;
          responseText += `   - Status: ${campaign.status || 'N/A'}\n`;
          responseText += `   - Denní rozpočet: ${campaign.dailyBudget ? `${campaign.dailyBudget}` : 'Není nastaven'}\n`;
          responseText += `   - Vytvořeno: ${campaign.createdTime ? new Date(campaign.createdTime).toLocaleDateString() : 'N/A'}\n\n`;
        });
      }
      return { content: [{ type: 'text', text: responseText }] };
    }
  );

  server.tool(
    'get_campaign_details',
    {
      campaignId: z.string().describe('ID kampaně')
    },
    async ({ campaignId }) => { // Destructure arguments
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
    }
  );

  server.tool(
    'update_campaign',
     {
        campaignId: z.string().describe('ID kampaně k aktualizaci'),
        name: z.string().optional().describe('Nový název kampaně'),
        status: z.string().optional().describe('Nový status kampaně (ACTIVE, PAUSED)'),
        dailyBudget: z.string().optional().describe('Nový denní rozpočet v měně účtu (např. "1500.00")'),
        endTime: z.string().optional().describe('Nový čas konce kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)')
     },
    async ({ campaignId, name, status, dailyBudget, endTime }) => { // Destructure arguments
       // Check if at least one updateable field is provided
       if (!name && !status && !dailyBudget && !endTime) {
           // Throw standard Error or handle appropriately, McpError might not be available
           throw new Error('Musí být poskytnut alespoň jeden parametr k aktualizaci (name, status, dailyBudget, endTime).');
       }
      const result = await campaignTools.updateCampaign(
        campaignId,
        name,
        status,
        dailyBudget ? parseFloat(dailyBudget) : undefined,
        endTime
      );
      return {
         // Removed leading emojis
        content: [{ type: 'text', text: result.success ? `Kampaň (ID: ${campaignId}) byla úspěšně aktualizována!\n\n${result.message || ''}` : `Chyba při aktualizaci kampaně (ID: ${campaignId}): ${result.message}` }]
      };
    }
  );

  server.tool(
    'delete_campaign',
    {
      campaignId: z.string().describe('ID kampaně k odstranění')
    },
    async ({ campaignId }) => { // Destructure arguments
      const result = await campaignTools.deleteCampaign(campaignId);
      return {
         // Removed leading emojis
        content: [{ type: 'text', text: result.success ? `Kampaň (ID: ${campaignId}) byla úspěšně odstraněna!\n\n${result.message || ''}` : `Chyba při odstraňování kampaně (ID: ${campaignId}): ${result.message}` }]
      };
    }
  );

  // --- Registrace nástrojů pro analýzu a vyhodnocování ---
  server.tool(
    'get_campaign_insights',
    {
      campaignId: z.string().describe('ID kampaně'),
      since: z.string().describe('Datum začátku ve formátu YYYY-MM-DD'),
      until: z.string().describe('Datum konce ve formátu YYYY-MM-DD'),
      metrics: z.string().optional().describe('Volitelný seznam metrik oddělených čárkou (např. impressions,clicks,spend). Výchozí: impressions, clicks, spend, cpc, ctr, reach, frequency, actions')
    },
    async ({ campaignId, since, until, metrics }) => { // Destructure arguments
      const timeRange = { since, until };
      let metricsArray = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency', 'actions'];
      if (metrics) {
        metricsArray = metrics.split(',').map(m => m.trim()).filter(m => m.length > 0);
      }
      const result = await analyticsTools.getCampaignInsights(
        campaignId,
        timeRange,
        metricsArray
      );
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
                  summaryInsight[metric].forEach((action: { action_type: string; value: string }) => {
                      responseText += `    - ${action.action_type}: ${action.value}\n`;
                  });
              } else {
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
           result.insights.forEach((insight: any, index: number) => {
               responseText += `\n* Záznam ${index + 1} (${insight.date_start} - ${insight.date_stop}):\n`;
               metricsArray.forEach(metric => {
                   if (insight[metric] !== undefined) {
                       if (metric === 'actions' && Array.isArray(insight[metric])) {
                           responseText += `  - ${metric}:\n`;
                           insight[metric].forEach((action: { action_type: string; value: string }) => {
                               responseText += `      - ${action.action_type}: ${action.value}\n`;
                           });
                       } else {
                          responseText += `  - ${metric}: ${insight[metric]}\n`;
                       }
                   }
               });
           });
       }
      return { content: [{ type: 'text', text: responseText }] };
    }
  );

  // --- Registrace nástrojů pro insights Ad Setů ---
  server.tool(
    'get_adset_insights',
    {
      adSetId: z.string().describe('ID reklamní sady (Ad Set)'),
      since: z.string().describe('Datum začátku ve formátu YYYY-MM-DD'),
      until: z.string().describe('Datum konce ve formátu YYYY-MM-DD'),
      metrics: z.string().optional().describe('Volitelný seznam metrik oddělených čárkou (např. impressions,clicks,spend). Výchozí: impressions, clicks, spend, cpc, ctr, reach, frequency, actions')
    },
    async ({ adSetId, since, until, metrics }) => {
      const timeRange = { since, until };
      let metricsArray = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency', 'actions'];
      if (metrics) {
        metricsArray = metrics.split(',').map(m => m.trim()).filter(m => m.length > 0);
      }
      const result = await analyticsTools.getAdSetInsights(
        adSetId,
        timeRange,
        metricsArray
      );
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
                  summaryInsight[metric].forEach((action: { action_type: string; value: string }) => {
                      responseText += `    - ${action.action_type}: ${action.value}\n`;
                  });
              } else {
                 responseText += `- ${metric}: ${summaryInsight[metric]}\n`;
              }
          }
      });
      return { content: [{ type: 'text', text: responseText }] };
    }
  );

  // --- Registrace nástrojů pro insights jednotlivých reklam ---
  server.tool(
    'get_ad_insights',
    {
      adId: z.string().describe('ID reklamy (Ad)'),
      since: z.string().describe('Datum začátku ve formátu YYYY-MM-DD'),
      until: z.string().describe('Datum konce ve formátu YYYY-MM-DD'),
      metrics: z.string().optional().describe('Volitelný seznam metrik oddělených čárkou (např. impressions,clicks,spend). Výchozí: impressions, clicks, spend, cpc, ctr, reach, frequency, actions')
    },
    async ({ adId, since, until, metrics }) => {
      const timeRange = { since, until };
      let metricsArray = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency', 'actions'];
      if (metrics) {
        metricsArray = metrics.split(',').map(m => m.trim()).filter(m => m.length > 0);
      }
      const result = await analyticsTools.getAdInsights(
        adId,
        timeRange,
        metricsArray
      );
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
                  summaryInsight[metric].forEach((action: { action_type: string; value: string }) => {
                      responseText += `    - ${action.action_type}: ${action.value}\n`;
                  });
              } else {
                 responseText += `- ${metric}: ${summaryInsight[metric]}\n`;
              }
          }
      });
      return { content: [{ type: 'text', text: responseText }] };
    }
  );

  // --- Registrace nástrojů pro získání seznamu Ad Setů ---
  server.tool(
    'get_adsets',
    {
      campaignId: z.string().optional().describe('Volitelné ID kampaně pro filtrování'),
      limit: z.string().optional().describe('Maximální počet Ad Setů k zobrazení (výchozí: 25)'),
      status: z.string().optional().describe('Filtrování podle statusu (ACTIVE, PAUSED, ARCHIVED)')
    },
    async ({ campaignId, limit, status }) => {
      const result = await analyticsTools.getAdSets(
        campaignId,
        limit ? parseInt(limit) : 25,
        status
      );
      if (!result.success) {
        return { content: [{ type: 'text', text: `❌ Chyba při získávání Ad Setů: ${result.message}` }], isError: true };
      }
      let responseText = `📋 Seznam reklamních sad (celkem ${result.adSets?.length || 0}):\n\n`;
      if (!result.adSets || result.adSets.length === 0) {
        responseText += 'Nebyly nalezeny žádné reklamní sady odpovídající zadaným kritériím.';
      } else {
        result.adSets.forEach((adSet: any, index: number) => {
          responseText += `${index + 1}. **${adSet.name}** (ID: ${adSet.id})\n`;
          responseText += `   - Status: ${adSet.status || 'N/A'} (${adSet.effectiveStatus || 'N/A'})\n`;
          responseText += `   - Kampaň ID: ${adSet.campaignId || 'N/A'}\n`;
          responseText += `   - Optimalizace: ${adSet.optimizationGoal || 'N/A'}\n`;
          responseText += `   - Rozpočet: ${adSet.dailyBudget ? `${adSet.dailyBudget}/den` : adSet.lifetimeBudget ? `${adSet.lifetimeBudget} celkem` : 'Není nastaven'}\n\n`;
        });
      }
      return { content: [{ type: 'text', text: responseText }] };
    }
  );

  // --- Registrace nástrojů pro získání seznamu reklam ---
  server.tool(
    'get_ads',
    {
      adSetId: z.string().optional().describe('Volitelné ID Ad Set pro filtrování'),
      campaignId: z.string().optional().describe('Volitelné ID kampaně pro filtrování'),
      limit: z.string().optional().describe('Maximální počet reklam k zobrazení (výchozí: 25)'),
      status: z.string().optional().describe('Filtrování podle statusu (ACTIVE, PAUSED, ARCHIVED)')
    },
    async ({ adSetId, campaignId, limit, status }) => {
      const result = await analyticsTools.getAds(
        adSetId,
        campaignId,
        limit ? parseInt(limit) : 25,
        status
      );
      if (!result.success) {
        return { content: [{ type: 'text', text: `❌ Chyba při získávání reklam: ${result.message}` }], isError: true };
      }
      let responseText = `📋 Seznam reklam (celkem ${result.ads?.length || 0}):\n\n`;
      if (!result.ads || result.ads.length === 0) {
        responseText += 'Nebyly nalezeny žádné reklamy odpovídající zadaným kritériím.';
      } else {
        result.ads.forEach((ad: any, index: number) => {
          responseText += `${index + 1}. **${ad.name}** (ID: ${ad.id})\n`;
          responseText += `   - Status: ${ad.status || 'N/A'} (${ad.effectiveStatus || 'N/A'})\n`;
          responseText += `   - Ad Set ID: ${ad.adSetId || 'N/A'}\n`;
          responseText += `   - Kampaň ID: ${ad.campaignId || 'N/A'}\n`;
          responseText += `   - Vytvořeno: ${ad.createdTime ? new Date(ad.createdTime).toLocaleDateString() : 'N/A'}\n\n`;
        });
      }
      return { content: [{ type: 'text', text: responseText }] };
    }
  );

  // --- Registrace nástrojů pro správu publik ---
  server.tool(
      'create_custom_audience',
      {
          name: z.string().describe('Název publika'),
          subtype: z.string().describe('Podtyp publika (CUSTOM, WEBSITE, ENGAGEMENT). Pro LOOKALIKE použij nástroj create_lookalike_audience.'), // Clarified subtype usage
          description: z.string().optional().describe('Volitelný popis publika'),
          customer_file_source: z.string().optional().describe('Zdroj dat pro CUSTOM subtype (POVINNÉ pro CUSTOM, např. USER_PROVIDED_ONLY)'), // Clarified requirement
          rule: z.object({}).passthrough().optional().describe('Pravidlo pro WEBSITE nebo ENGAGEMENT subtype (POVINNÉ pro WEBSITE/ENGAGEMENT, komplexní JSON objekt dle FB API - viz dokumentace)') // Clarified requirement and complexity
      },
      async ({ name, subtype, description, customer_file_source }) => { // Destructure arguments
          if (subtype === 'CUSTOM' && (!description || !customer_file_source)) {
             // Throw standard Error or handle appropriately
             throw new Error('Parametry description a customer_file_source jsou povinné pro CUSTOM subtype.');
          }
          // TODO: Add validation for other subtypes if necessary

          const result = await audienceTools.createCustomAudience(
              name,
              description || '',
              customer_file_source || '',
              subtype
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
      }
  );

  server.tool(
      'get_audiences',
      {
          limit: z.string().optional().describe('Maximální počet publik k zobrazení (číslo)')
      },
      async ({ limit }) => { // Destructure arguments
          const result = await audienceTools.getCustomAudiences(limit ? parseInt(limit) : undefined);
          if (!result.success || !result.audiences) {
              return { content: [{ type: 'text', text: `❌ Chyba při získávání publik: ${result.message}` }], isError: true };
          }
          let responseText = `👥 Seznam dostupných vlastních publik (celkem ${result.audiences.length}):\n\n`;
          if (result.audiences.length === 0) {
              responseText += 'Nebyly nalezeny žádná publika.';
          } else {
              result.audiences.forEach((audience: any, index: number) => {
                  responseText += `${index + 1}. **${audience.name}** (ID: ${audience.id})\n`;
                  responseText += `   - Typ: ${audience.subtype || 'N/A'}\n`;
                  responseText += `   - Přibližná velikost: ${audience.approximateCount ? audience.approximateCount : 'N/A'}\n`;
                  responseText += `   - Popis: ${audience.description || '-'}\n\n`;
              });
          }
          return { content: [{ type: 'text', text: responseText }] };
       }
   );

  server.tool(
      'create_lookalike_audience', // Tool specifically for Lookalike audiences
      {
          sourceAudienceId: z.string().describe('ID zdrojového Custom Audience (musí existovat)'),
          name: z.string().describe('Název nového Lookalike Audience'),
          description: z.string().optional().describe('Volitelný popis Lookalike Audience'),
          country: z.string().length(2).describe('Kód země (ISO 3166-1 alpha-2), pro kterou se má Lookalike vytvořit (např. "US", "CZ")'),
          ratio: z.number().min(0.01).max(0.2).optional().describe('Poměr podobnosti (1-20%), např. 0.01 pro 1%. Výchozí je 0.01.')
      },
      async ({ sourceAudienceId, name, description, country, ratio }) => { // Destructure arguments
          const result = await audienceTools.createLookalikeAudience(
              sourceAudienceId,
              name,
              description || '', // Pass empty string if undefined
              country,
              ratio // Pass ratio, function has default
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
      }
  );

  // --- Registrace nástrojů pro Ad Sets ---
  server.tool(
      'create_ad_set',
      {
          campaignId: z.string().describe('ID kampaně, pod kterou sada patří'),
          name: z.string().describe('Název reklamní sady'),
          status: z.string().describe('Status sady (ACTIVE, PAUSED, ARCHIVED)'),
          targeting: z.any().describe('Specifikace cílení (komplexní objekt, viz FB dokumentace)'), // Using z.any() for complex targeting
          optimizationGoal: z.string().describe('Cíl optimalizace (např. REACH, OFFSITE_CONVERSIONS)'),
          billingEvent: z.string().describe('Událost pro účtování (např. IMPRESSIONS, LINK_CLICKS)'),
          bidAmount: z.number().int().positive().optional().describe('Nabídka v centech (volitelné)'),
          dailyBudget: z.number().int().positive().optional().describe('Denní rozpočet v centech (volitelné)'),
          lifetimeBudget: z.number().int().positive().optional().describe('Celoživotní rozpočet v centech (volitelné)'),
          startTime: z.string().datetime({ offset: true }).optional().describe('Čas začátku (ISO 8601, volitelné)'),
          endTime: z.string().datetime({ offset: true }).optional().describe('Čas konce (ISO 8601, volitelné)')
      },
      async (params) => {
          // Basic validation for budget (either daily or lifetime must be set)
          if (!params.dailyBudget && !params.lifetimeBudget) {
              throw new Error('Musí být nastaven alespoň denní nebo celoživotní rozpočet.');
          }
          if (params.dailyBudget && params.lifetimeBudget) {
              throw new Error('Nelze nastavit současně denní i celoživotní rozpočet.');
          }

          const result = await adSetTools.createAdSet(
              params.campaignId,
              params.name,
              params.status,
              params.targeting,
              params.optimizationGoal,
              params.billingEvent,
              params.bidAmount,
              params.dailyBudget,
              params.lifetimeBudget,
              params.startTime,
              params.endTime
          );
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
      }
  );
  // --- Registrace nástrojů pro správu příspěvků ---
  server.tool(
      'create_post',
      {
          content: z.string().describe('Obsah příspěvku'),
          link: z.string().optional().describe('Volitelný odkaz, který bude součástí příspěvku'),
          imagePath: z.string().optional().describe('Volitelná cesta k obrázku, který bude součástí příspěvku')
      },
      async ({ content, link, imagePath }) => { // Destructure arguments
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
          } catch (error: any) {
               console.error(`Chyba při vytváření příspěvku:`, error);
               return { content: [{ type: 'text', text: `❌ Chyba při vytváření příspěvku: ${error.message}` }], isError: true };
          }
      }
  );


  
  
  server.tool(
    'list_connected_accounts',
    {},
    async () => {
      const pages = listConnectedPages();
      if (pages.length === 0) {
        return { content: [{ type: 'text', text: 'Zadne propojene ucty.\nPrihlaste se pres: http://localhost:3456/auth/login' }] };
      }
      let text = 'Propojene Facebook ucty (' + pages.length + '):\n\n';
      pages.forEach((p: {id: string; name: string; category?: string}, i: number) => {
        text += (i + 1) + '. ' + p.name + ' (ID: ' + p.id + ')' + (p.category ? ' - ' + p.category : '') + '\n';
      });
      text += '\nPro pridani dalsich uctu: http://localhost:3456/auth/login\nStatus: http://localhost:3456/status';
      return { content: [{ type: 'text', text }] };
    }
  );

  
  server.tool(
    'connect_facebook_account',
    {},
    async () => {
      const cfg = loadConfig();
      if (!cfg) {
        return { content: [{ type: 'text', text: 'Neni nastavena Facebook App. Spust nejdrive setup.' }] };
      }
      const port = 3456;
      const redirectUri = 'http://localhost:' + port + '/auth/callback';
      const scopes = 'ads_management,ads_read,pages_manage_ads,pages_read_engagement,pages_show_list,business_management';
      const loginUrl = 'https://www.facebook.com/v19.0/dialog/oauth?client_id=' + cfg.appId +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&scope=' + scopes + '&response_type=code';
      const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(openCmd + ' "' + loginUrl + '"');
      return { content: [{ type: 'text', text: 'Oteviram Facebook prihlaseni v prohlizeci.\n\nPo uspesnem prihlaseni se vsechny tvoje stranky automaticky propoji. Pote rici: Zobraz propojene ucty.' }] };
    }
  );

  return server; // Return the created server instance
};

// Hlavní funkce pro spuštění serveru
const startServer = async () => {
  try {
    // Zajisti ze uzivatel je prihlasen
    await ensureAuth();
    const server = await initializeServer();
    // Spust OAuth callback server (pro connect_facebook_account)
    const { startAuthServer } = await import('./auth-manager.js');
    const cfg = loadConfig();
    if (cfg) startAuthServer(cfg.appId, cfg.appSecret);

    // Create transport here
    const transport = new StdioTransport();

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

  } catch (error) {
    // Log critical errors to stderr so they don't interfere with stdout MCP messages
    console.error(`❌ Kritická chyba při startu serveru: ${error instanceof Error ? error.stack : error}`);
    process.exit(1);
  }
};

// Spuštění serveru
startServer();
