import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; 
// McpError and ErrorCode removed from imports, will rely on standard Error or handle later if needed
import { StdioServerTransport as StdioTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod'; // Import zod for schema definition
import { config, initFacebookSdk, validateConfig, getAdAccount } from './config.js';
import * as campaignTools from './tools/campaign-tools.js';
import * as audienceTools from './tools/audience-tools.js';
import * as analyticsTools from './tools/analytics-tools.js';
import { prompts, fillPromptTemplate } from './prompts/campaign-templates.js';

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
      objective: z.string().describe('Cíl kampaně (např. REACH, LINK_CLICKS, CONVERSIONS)'),
      status: z.string().describe('Status kampaně (ACTIVE, PAUSED)'),
      dailyBudget: z.string().optional().describe('Denní rozpočet v měně účtu (např. "1000.50")'),
      startTime: z.string().optional().describe('Čas začátku kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)'),
      endTime: z.string().optional().describe('Čas konce kampaně ve formátu ISO (YYYY-MM-DDTHH:MM:SS+0000)')
    },
    // Destructure arguments directly in the handler signature
    async ({ name, objective, status, dailyBudget, startTime, endTime }) => { 
      const result = await campaignTools.createCampaign(
        name,
        objective,
        status,
        dailyBudget ? parseFloat(dailyBudget) : undefined,
        startTime,
        endTime
      );
      return {
        // Removed leading emojis
        content: [{ type: 'text', text: result.success ? `Kampaň byla úspěšně vytvořena!\n\nID kampaně: ${result.campaignId}\n\n${result.message || ''}` : `Chyba při vytváření kampaně: ${result.message}` }]
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

  // --- Registrace nástrojů pro správu publik ---
  server.tool(
      'create_custom_audience',
      {
          name: z.string().describe('Název publika'),
          subtype: z.string().describe('Podtyp publika (např. CUSTOM, WEBSITE, ENGAGEMENT, LOOKALIKE)'),
          description: z.string().optional().describe('Volitelný popis publika'),
          customer_file_source: z.string().optional().describe('Zdroj dat pro CUSTOM subtype (např. USER_PROVIDED_ONLY, PARTNER_PROVIDED_ONLY)'),
          rule: z.object({}).passthrough().optional().describe('Pravidlo pro WEBSITE nebo ENGAGEMENT subtype (JSON objekt dle FB API)') 
      },
      async ({ name, subtype, description, customer_file_source, rule }) => { // Destructure arguments
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
          return {
               // Removed leading emojis
              content: [{ type: 'text', text: result.success ? `Vlastní publikum "${name}" (typ: ${subtype}) vytvořeno (ID: ${result.audienceId}). ${result.message || ''}` : `Chyba: ${result.message}` }]
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

  // --- Registrace nástrojů pro AI asistenci ---
   server.tool(
       'generate_campaign_prompt',
       {
           templateName: z.string().describe('Název šablony promptu (např. new_product_launch, lead_generation). Dostupné šablony: ' + Object.keys(prompts).join(', ')),
           variables: z.record(z.string()).describe('Objekt s proměnnými pro vyplnění šablony (např. {"productName": "XYZ", "targetAudience": "...", "budget": "1000"})')
       },
       async ({ templateName, variables }) => { // Destructure arguments
           try {
               const prompt = fillPromptTemplate(templateName, variables);
               return { content: [{ type: 'text', text: `📝 Vygenerovaný prompt pro šablonu "${templateName}":\n\n${prompt}` }] };
           } catch (error: any) {
               console.error(`Chyba při generování promptu '${templateName}':`, error); // Use console.error
               return { content: [{ type: 'text', text: `❌ Chyba při generování promptu: ${error.message}` }], isError: true };
           }
       }
   );

  return server; // Return the created server instance
};

// Hlavní funkce pro spuštění serveru
const startServer = async () => {
  try {
    // console.log('🚀 Inicializace MCP serveru...'); // Removed console log
    const server = await initializeServer(); // Directly get the server instance
    
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
