import { AdAccount, Campaign } from 'facebook-nodejs-business-sdk';
import { config } from './config'; // Correct import path

// Získání instance AdAccount
const getAdAccount = () => {
  // Ensure the account ID is available before creating the AdAccount instance
  if (!config.facebookAccountId) {
      throw new Error('Facebook Account ID není nakonfigurováno v config.ts.');
  }
  return new AdAccount(config.facebookAccountId); // Correct config property access
};

// Vytvoření nové kampaně
export const createCampaign = async (
  name: string,
  objective: string,
  status: string,
  dailyBudget?: number,
  startTime?: string,
  endTime?: string
) => {
  try {
    const adAccount = getAdAccount();
    
    // Připravení parametrů pro vytvoření kampaně
    const params: any = {
      name,
      objective,
      status
    };
    
    // Přidání volitelných parametrů pokud jsou poskytnuty
    if (dailyBudget) {
      params.daily_budget = dailyBudget * 100; // Facebook vyžaduje budget v nejmenších jednotkách měny (centy)
    }
    
    if (startTime) {
      params.start_time = startTime;
    }
    
    if (endTime) {
      params.end_time = endTime;
    }
    
    // Vytvoření kampaně - pass fields array (empty) first, then params
    const result = await adAccount.createCampaign([], params); 
    
    return {
      success: true,
      // Access ID directly from the returned result object
      campaignId: result.id, 
      message: 'Kampaň byla úspěšně vytvořena'
    };
  } catch (error) {
    console.error('Chyba při vytváření kampaně:', error);
    return {
      success: false,
      message: `Chyba při vytváření kampaně: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání seznamu kampaní
export const getCampaigns = async (limit = 10, status?: string) => {
  try {
    const adAccount = getAdAccount();
    
    // Nastavení filtrů pro získání kampaní
    const fields = ['id', 'name', 'objective', 'status', 'created_time', 'start_time', 'stop_time', 'daily_budget', 'lifetime_budget'];
    const params: any = {
      limit
    };
    
    if (status) {
      params.filtering = [
        {
          field: 'status',
          operator: 'EQUAL',
          value: status
        }
      ];
    }
    
    // Získání kampaní
    const campaigns = await adAccount.getCampaigns(fields, params);
    
    // Formátování výsledků
    return {
      success: true,
      campaigns: campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        createdTime: campaign.created_time,
        startTime: campaign.start_time,
        stopTime: campaign.stop_time,
        dailyBudget: campaign.daily_budget ? campaign.daily_budget / 100 : null, // Konverze z centů
        lifetimeBudget: campaign.lifetime_budget ? campaign.lifetime_budget / 100 : null
      }))
    };
  } catch (error) {
    console.error('Chyba při získávání kampaní:', error);
    return {
      success: false,
      message: `Chyba při získávání kampaní: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Aktualizace kampaně
export const updateCampaign = async (
  campaignId: string,
  name?: string,
  status?: string,
  dailyBudget?: number,
  endTime?: string
) => {
  try {
    // Získání objektu kampaně
    const campaign = new Campaign(campaignId);
    
    // Příprava parametrů pro aktualizaci
    const params: any = {};
    
    if (name) params.name = name;
    if (status) params.status = status;
    if (dailyBudget) params.daily_budget = dailyBudget * 100;
    if (endTime) params.end_time = endTime;
    
    // Aktualizace kampaně
    await campaign.update(params);
    
    return {
      success: true,
      message: 'Kampaň byla úspěšně aktualizována'
    };
  } catch (error) {
    console.error('Chyba při aktualizaci kampaně:', error);
    return {
      success: false,
      message: `Chyba při aktualizaci kampaně: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání podrobností o kampani
export const getCampaignDetails = async (campaignId: string) => {
  try {
    // Získání objektu kampaně
    const campaign = new Campaign(campaignId);
    
    // Načtení detailů kampaně
    const fields = [
      'id', 'name', 'objective', 'status', 'created_time', 
      'start_time', 'stop_time', 'daily_budget', 'lifetime_budget',
      'spend_cap', 'budget_remaining', 'buying_type', 'special_ad_categories'
    ];
    
    // Use 'as any' and access via _data for properties after get()
    const campaignDetails: any = await campaign.get(fields); 
    
    // Formátování výsledku
    return {
      success: true,
      campaign: {
        id: campaignDetails._data?.id,
        name: campaignDetails._data?.name,
        objective: campaignDetails._data?.objective,
        status: campaignDetails._data?.status,
        createdTime: campaignDetails._data?.created_time,
        startTime: campaignDetails._data?.start_time,
        stopTime: campaignDetails._data?.stop_time,
        dailyBudget: campaignDetails._data?.daily_budget ? campaignDetails._data.daily_budget / 100 : null,
        lifetimeBudget: campaignDetails._data?.lifetime_budget ? campaignDetails._data.lifetime_budget / 100 : null,
        spendCap: campaignDetails._data?.spend_cap ? campaignDetails._data.spend_cap / 100 : null,
        budgetRemaining: campaignDetails._data?.budget_remaining ? campaignDetails._data.budget_remaining / 100 : null,
        buyingType: campaignDetails._data?.buying_type,
        specialAdCategories: campaignDetails._data?.special_ad_categories
      }
    };
  } catch (error) {
    console.error('Chyba při získávání detailů kampaně:', error);
    return {
      success: false,
      message: `Chyba při získávání detailů kampaně: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Odstranění kampaně
export const deleteCampaign = async (campaignId: string) => {
  try {
    // Získání objektu kampaně
    const campaign = new Campaign(campaignId);
    
    // Odstranění kampaně - pass empty array for fields as per type defs
    await campaign.delete([]); 
    
    return {
      success: true,
      message: 'Kampaň byla úspěšně odstraněna'
    };
  } catch (error) {
    console.error('Chyba při odstraňování kampaně:', error);
    return {
      success: false,
      message: `Chyba při odstraňování kampaně: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};
