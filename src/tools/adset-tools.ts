import { AdAccount, Campaign, AdSet } from 'facebook-nodejs-business-sdk';
import { config } from '../config.js';

// Helper function to get AdAccount instance
const getAdAccount = () => {
  if (!config.facebookAccountId) {
    throw new Error('Facebook Account ID není nakonfigurováno v config.js');
  }
  return new AdAccount(config.facebookAccountId);
};

// --- Nástroje pro Ad Sets ---

// Vytvoření nové reklamní sady (Ad Set)
export const createAdSet = async (
  campaignId: string,
  name: string,
  status: string,
  targeting: any, // Targeting spec can be complex, using 'any' for now
  optimizationGoal: string,
  billingEvent: string,
  bidAmount?: number, // Optional bid amount in cents
  dailyBudget?: number, // Optional daily budget in cents
  lifetimeBudget?: number, // Optional lifetime budget in cents
  startTime?: string,
  endTime?: string
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
    if (!dailyBudget && !lifetimeBudget) {
        throw new Error('Musí být nastaven alespoň denní nebo celoživotní rozpočet.');
    }

    const params: any = {
      campaign_id: campaignId,
      name: name,
      status: status,
      targeting: targeting, // Targeting spec object
      optimization_goal: optimizationGoal, // e.g., REACH, IMPRESSIONS, LINK_CLICKS, OFFSITE_CONVERSIONS
      billing_event: billingEvent, // e.g., IMPRESSIONS, LINK_CLICKS
      // Add optional parameters
      ...(bidAmount && { bid_amount: bidAmount }),
      ...(dailyBudget && { daily_budget: dailyBudget }),
      ...(lifetimeBudget && { lifetime_budget: lifetimeBudget }),
      ...(startTime && { start_time: startTime }),
      ...(endTime && { end_time: endTime }),
    };
    
    // Define fields to retrieve after creation
    const fieldsToRead = ['id', 'name', 'status', 'optimization_goal', 'billing_event', 'daily_budget', 'lifetime_budget', 'start_time', 'end_time'];

    // Create AdSet and request fields in response
    const adSet: AdSet = await adAccount.createAdSet(fieldsToRead, params);

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
        // Note: Targeting and bidAmount are not typically readable fields in the same way
    };

    return {
      success: true,
      adSetId: adSetData.id, // Keep adSetId for consistency
      adSetData: adSetData, // Return the fetched data
      message: 'Reklamní sada byla úspěšně vytvořena a data načtena.'
    };
  } catch (error) {
    console.error('Chyba při vytváření reklamní sady:', error);
    // Attempt to parse Facebook API error
    let errorMessage = `Chyba při vytváření reklamní sady: ${error instanceof Error ? error.message : 'Neznámá chyba'}`;
    if (error && typeof error === 'object' && 'response' in error) {
        const fbError = (error as any).response?.data?.error;
        if (fbError) {
            errorMessage = `Facebook API Error (${fbError.code}): ${fbError.message}. ${fbError.error_user_title ? `(${fbError.error_user_title})` : ''} ${fbError.error_user_msg || ''}`;
        }
    }
    return {
      success: false,
      message: errorMessage
    };
  }
};

// TODO: Implement getAdSets
// TODO: Implement getAdSetDetails
// TODO: Implement updateAdSet
// TODO: Implement deleteAdSet
