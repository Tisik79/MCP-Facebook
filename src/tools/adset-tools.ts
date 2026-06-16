import { AdAccount, Campaign, AdSet } from 'facebook-nodejs-business-sdk';
import { config } from '../config.js';
import { formatFbError } from './fb-error.js';

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
  endTime?: string,
  promotedObject?: any, // Optional promoted_object (lead kampaně: pixel_id/custom_event_type nebo page_id)
  destinationType?: string, // Optional destination_type (WEBSITE, ON_AD, MESSENGER, PHONE_CALL, INSTAGRAM_DIRECT)
  dsaBeneficiary?: string, // EU DSA: kdo z reklamy těží (povinné u cílení na EU)
  dsaPayor?: string // EU DSA: kdo reklamu platí (default = beneficiary)
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
        const camp: any = await new Campaign(campaignId).read(['daily_budget', 'lifetime_budget']);
        cboInherited = !!(camp?._data?.daily_budget || camp?._data?.lifetime_budget);
      } catch {
        // Pokud kampaň nelze načíst, necháme rozpočet projít a spolehneme se na API validaci.
      }
    }
    const effDailyBudget = cboInherited ? undefined : dailyBudget;
    const effLifetimeBudget = cboInherited ? undefined : lifetimeBudget;

    // DSA inzerent: explicitní param má přednost, jinak fallback z .env (config).
    // Payor se když chybí dorovná na beneficiary.
    const effDsaBeneficiary = dsaBeneficiary ?? config.dsaBeneficiary;
    const effDsaPayor = dsaPayor ?? config.dsaPayor ?? effDsaBeneficiary;

    const params: any = {
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
  } catch (error) {
    console.error('Chyba při vytváření reklamní sady:', error);
    return {
      success: false,
      message: formatFbError(error, 'Chyba při vytváření reklamní sady')
    };
  }
};

// Úprava reklamní sady (status ACTIVE/PAUSED, název).
// Pozor: SDK `new AdSet(id).update(params)` je přes globální default API, které se zde
// neinicializuje tokenem → tichý no-op (request neodejde s platným tokenem). Proto jde
// úprava přímo na Graph API s explicitním tokenem + READ-AFTER-WRITE ověřením, ať se
// nevrací optimistické echo, ale skutečný stav po zápisu.
export const updateAdSet = async (
  adSetId: string,
  updates: { name?: string; status?: string }
) => {
  try {
    if (!adSetId) throw new Error('Chybí adSetId.');
    const params: any = {};
    if (updates.name) params.name = updates.name;
    if (updates.status) params.status = updates.status;
    if (Object.keys(params).length === 0) {
      throw new Error('Nebyly zadány žádné změny (name / status).');
    }

    const token = config.facebookAccessToken;
    if (!token) throw new Error('Chybí access token (přihlas se k Facebooku).');
    const GRAPH_VERSION = process.env.FB_GRAPH_API_VERSION || 'v25.0';

    // 1) Zápis
    const body = new URLSearchParams({ ...params, access_token: token });
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${adSetId}`, { method: 'POST', body });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      return { success: false, message: formatFbError(data, 'Chyba při úpravě reklamní sady') };
    }

    // 2) Read-after-write – ověř, že se změna opravdu propsala
    const vRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${adSetId}`
      + `?fields=name,status,effective_status&access_token=${encodeURIComponent(token)}`);
    const v: any = await vRes.json().catch(() => ({}));
    if (v?.error) {
      return { success: false, message: formatFbError(v, 'Chyba při ověření úpravy reklamní sady') };
    }

    const mismatch: string[] = [];
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
  } catch (error) {
    console.error('Chyba při úpravě reklamní sady:', error);
    return {
      success: false,
      message: formatFbError(error, 'Chyba při úpravě reklamní sady')
    };
  }
};

// TODO: Implement getAdSets
// TODO: Implement getAdSetDetails
// TODO: Implement deleteAdSet
