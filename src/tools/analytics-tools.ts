import { AdAccount, Campaign, AdSet, Ad } from 'facebook-nodejs-business-sdk';
import { config } from '../config.js'; // Added .js extension

// Získání instance AdAccount
const getAdAccount = () => {
  // Corrected config access
  if (!config.facebookAccountId) { 
      throw new Error('Facebook Account ID není nakonfigurováno v config.js');
  }
  return new AdAccount(config.facebookAccountId); 
};

// Získání insights (analytických dat) pro kampaň
export const getCampaignInsights = async (
  campaignId: string,
  timeRange: { since: string; until: string } = { since: '2023-01-01', until: '2023-12-31' },
  metrics = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency']
) => {
  try {
    // Získání objektu kampaně
    const campaign = new Campaign(campaignId);
    
    // Nastavení parametrů pro získání insights
    const params = {
      time_range: timeRange,
      level: 'campaign'
    };
    
    // Získání insights
    const insights = await campaign.getInsights(metrics, params);
    
    if (!insights || insights.length === 0) {
      return {
        success: true,
        message: 'Žádná analytická data nejsou k dispozici pro zadané období',
        insights: null
      };
    }
    
    // Formátování výsledků
    const formattedInsights = insights.map((insight: any) => {
      // Vytvoření základního objektu s datem
      const result: any = {
        date_start: insight.date_start,
        date_stop: insight.date_stop
      };
      
      // Přidání všech metrik
      metrics.forEach(metric => {
        if (insight[metric] !== undefined) {
          // Konverze výdajů z centů na příslušnou měnu
          if (metric === 'spend') {
            result[metric] = parseFloat(insight[metric] || '0');
          } else {
            result[metric] = insight[metric];
          }
        }
      });
      
      return result;
    });
    
    return {
      success: true,
      insights: formattedInsights
    };
  } catch (error) {
    console.error('Chyba při získávání analytických dat kampaně:', error);
    return {
      success: false,
      message: `Chyba při získávání analytických dat kampaně: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání souhrnných analytických dat pro účet
export const getAccountInsights = async (
  timeRange: { since: string; until: string } = { since: '2023-01-01', until: '2023-12-31' },
  metrics = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency'],
  groupBy = 'day'
) => {
  try {
    const adAccount = getAdAccount();
    
    // Nastavení parametrů pro získání insights
    const params: any = {
      time_range: timeRange,
      level: 'account'
    };
    
    if (groupBy) {
      params.time_increment = groupBy === 'day' ? 1 
                           : groupBy === 'week' ? 7 
                           : groupBy === 'month' ? 30 
                           : 1;
    }
    
    // Získání insights
    const insights = await adAccount.getInsights(metrics, params);
    
    if (!insights || insights.length === 0) {
      return {
        success: true,
        message: 'Žádná analytická data nejsou k dispozici pro zadané období',
        insights: null
      };
    }
    
    // Formátování výsledků
    const formattedInsights = insights.map((insight: any) => {
      // Vytvoření základního objektu s datem
      const result: any = {
        date_start: insight.date_start,
        date_stop: insight.date_stop
      };
      
      // Přidání všech metrik
      metrics.forEach(metric => {
        if (insight[metric] !== undefined) {
          // Konverze výdajů z centů na příslušnou měnu
          if (metric === 'spend') {
            result[metric] = parseFloat(insight[metric] || '0');
          } else {
            result[metric] = insight[metric];
          }
        }
      });
      
      return result;
    });
    
    return {
      success: true,
      insights: formattedInsights
    };
  } catch (error) {
    console.error('Chyba při získávání analytických dat účtu:', error);
    return {
      success: false,
      message: `Chyba při získávání analytických dat účtu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Porovnání výkonu kampaní
export const compareCampaigns = async (
  campaignIds: string[],
  timeRange: { since: string; until: string } = { since: '2023-01-01', until: '2023-12-31' },
  metrics = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach']
) => {
  try {
    if (!campaignIds || campaignIds.length === 0) {
      return {
        success: false,
        message: 'Není zadána žádná kampaň pro porovnání'
      };
    }
    
    // Získání insights pro každou kampaň
    const campaignsData = await Promise.all(
      campaignIds.map(async (campaignId) => {
        const campaign = new Campaign(campaignId);
        
        // Získání základních informací o kampani
        const campaignInfo = await campaign.get(['id', 'name']);
        
        // Získání insights pro kampaň
        const params = {
          time_range: timeRange
        };
        
        const insights = await campaign.getInsights(metrics, params);
        
        // Agregace dat insights
        let aggregatedInsights: any = {};
        
        if (insights && insights.length > 0) {
          metrics.forEach(metric => {
            aggregatedInsights[metric] = insights.reduce((sum, item) => {
              const value = parseFloat(item[metric] || '0');
              return sum + value;
            }, 0);
          });
        }
        
        return {
          id: campaignInfo.id,
          // Access name via _data property
          name: campaignInfo._data?.name, 
          insights: aggregatedInsights
        };
      })
    );
    
    return {
      success: true,
      campaigns: campaignsData
    };
  } catch (error) {
    console.error('Chyba při porovnávání kampaní:', error);
    return {
      success: false,
      message: `Chyba při porovnávání kampaní: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání demografických údajů o publiku kampaně
export const getCampaignDemographics = async (
  campaignId: string,
  timeRange: { since: string; until: string } = { since: '2023-01-01', until: '2023-12-31' }
) => {
  try {
    // Získání objektu kampaně
    const campaign = new Campaign(campaignId);
    
    // Nastavení parametrů pro získání demografických údajů
    const params = {
      time_range: timeRange,
      breakdowns: ['age', 'gender']
    };
    
    const metrics = ['impressions', 'clicks', 'spend', 'reach'];
    
    // Získání insights s demografickým rozdělením
    const insights = await campaign.getInsights(metrics, params);
    
    if (!insights || insights.length === 0) {
      return {
        success: true,
        message: 'Žádná demografická data nejsou k dispozici pro zadané období',
        demographics: null
      };
    }
    
    // Zpracování výsledků do strukturované podoby
    const demographics: any = {
      age: {},
      gender: {},
      ageGender: {}
    };
    
    insights.forEach((insight: any) => {
      const age = insight.age;
      const gender = insight.gender;
      const key = `${gender}_${age}`;
      
      // Přidání dat do kategorie věku
      if (!demographics.age[age]) {
        demographics.age[age] = {
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0
        };
      }
      
      // Přidání dat do kategorie pohlaví
      if (!demographics.gender[gender]) {
        demographics.gender[gender] = {
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0
        };
      }
      
      // Přidání dat do kombinované kategorie věk+pohlaví
      demographics.ageGender[key] = {
        impressions: parseInt(insight.impressions || '0'),
        clicks: parseInt(insight.clicks || '0'),
        spend: parseFloat(insight.spend || '0'),
        reach: parseInt(insight.reach || '0')
      };
      
      // Aktualizace agregací podle věku
      demographics.age[age].impressions += parseInt(insight.impressions || '0');
      demographics.age[age].clicks += parseInt(insight.clicks || '0');
      demographics.age[age].spend += parseFloat(insight.spend || '0');
      demographics.age[age].reach += parseInt(insight.reach || '0');
      
      // Aktualizace agregací podle pohlaví
      demographics.gender[gender].impressions += parseInt(insight.impressions || '0');
      demographics.gender[gender].clicks += parseInt(insight.clicks || '0');
      demographics.gender[gender].spend += parseFloat(insight.spend || '0');
      demographics.gender[gender].reach += parseInt(insight.reach || '0');
    });
    
    return {
      success: true,
      demographics
    };
  } catch (error) {
    console.error('Chyba při získávání demografických údajů:', error);
    return {
      success: false,
      message: `Chyba při získávání demografických údajů: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání insights (analytických dat) pro Ad Set
export const getAdSetInsights = async (
  adSetId: string,
  timeRange: { since: string; until: string } = { since: '2023-01-01', until: '2023-12-31' },
  metrics = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency']
) => {
  try {
    // Získání objektu Ad Set
    const adSet = new AdSet(adSetId);

    // Nastavení parametrů pro získání insights
    const params = {
      time_range: timeRange,
      level: 'adset'
    };

    // Získání insights
    const insights = await adSet.getInsights(metrics, params);

    if (!insights || insights.length === 0) {
      return {
        success: true,
        message: 'Žádná analytická data nejsou k dispozici pro zadané období',
        insights: null
      };
    }

    // Formátování výsledků
    const formattedInsights = insights.map((insight: any) => {
      const result: any = {
        date_start: insight.date_start,
        date_stop: insight.date_stop
      };

      metrics.forEach(metric => {
        if (insight[metric] !== undefined) {
          if (metric === 'spend') {
            result[metric] = parseFloat(insight[metric] || '0');
          } else {
            result[metric] = insight[metric];
          }
        }
      });

      return result;
    });

    return {
      success: true,
      insights: formattedInsights
    };
  } catch (error) {
    console.error('Chyba při získávání analytických dat Ad Set:', error);
    return {
      success: false,
      message: `Chyba při získávání analytických dat Ad Set: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání insights (analytických dat) pro jednotlivou reklamu (Ad)
export const getAdInsights = async (
  adId: string,
  timeRange: { since: string; until: string } = { since: '2023-01-01', until: '2023-12-31' },
  metrics = ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach', 'frequency']
) => {
  try {
    // Získání objektu Ad
    const ad = new Ad(adId);

    // Nastavení parametrů pro získání insights
    const params = {
      time_range: timeRange,
      level: 'ad'
    };

    // Získání insights
    const insights = await ad.getInsights(metrics, params);

    if (!insights || insights.length === 0) {
      return {
        success: true,
        message: 'Žádná analytická data nejsou k dispozici pro zadané období',
        insights: null
      };
    }

    // Formátování výsledků
    const formattedInsights = insights.map((insight: any) => {
      const result: any = {
        date_start: insight.date_start,
        date_stop: insight.date_stop
      };

      metrics.forEach(metric => {
        if (insight[metric] !== undefined) {
          if (metric === 'spend') {
            result[metric] = parseFloat(insight[metric] || '0');
          } else {
            result[metric] = insight[metric];
          }
        }
      });

      return result;
    });

    return {
      success: true,
      insights: formattedInsights
    };
  } catch (error) {
    console.error('Chyba při získávání analytických dat reklamy:', error);
    return {
      success: false,
      message: `Chyba při získávání analytických dat reklamy: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání seznamu Ad Setů pro kampaň
export const getAdSets = async (
  campaignId?: string,
  limit = 25,
  status?: string
) => {
  try {
    const adAccount = getAdAccount();

    const params: any = {
      limit: limit
    };

    if (status) {
      params.filtering = [{ field: 'effective_status', operator: 'IN', value: [status] }];
    }

    if (campaignId) {
      params.filtering = params.filtering || [];
      params.filtering.push({ field: 'campaign_id', operator: 'EQUAL', value: campaignId });
    }

    const fields = ['id', 'name', 'status', 'effective_status', 'campaign_id', 'daily_budget', 'lifetime_budget', 'optimization_goal', 'billing_event', 'start_time', 'end_time'];

    const adSets = await adAccount.getAdSets(fields, params);

    const formattedAdSets = adSets.map((adSet: any) => ({
      id: adSet.id,
      name: adSet._data?.name,
      status: adSet._data?.status,
      effectiveStatus: adSet._data?.effective_status,
      campaignId: adSet._data?.campaign_id,
      dailyBudget: adSet._data?.daily_budget ? adSet._data.daily_budget / 100 : null,
      lifetimeBudget: adSet._data?.lifetime_budget ? adSet._data.lifetime_budget / 100 : null,
      optimizationGoal: adSet._data?.optimization_goal,
      billingEvent: adSet._data?.billing_event,
      startTime: adSet._data?.start_time,
      endTime: adSet._data?.end_time
    }));

    return {
      success: true,
      adSets: formattedAdSets
    };
  } catch (error) {
    console.error('Chyba při získávání Ad Setů:', error);
    return {
      success: false,
      message: `Chyba při získávání Ad Setů: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání seznamu reklam (Ads) pro Ad Set nebo kampaň
export const getAds = async (
  adSetId?: string,
  campaignId?: string,
  limit = 25,
  status?: string
) => {
  try {
    const adAccount = getAdAccount();

    const params: any = {
      limit: limit
    };

    if (status) {
      params.filtering = [{ field: 'effective_status', operator: 'IN', value: [status] }];
    }

    if (adSetId) {
      params.filtering = params.filtering || [];
      params.filtering.push({ field: 'adset_id', operator: 'EQUAL', value: adSetId });
    }

    if (campaignId) {
      params.filtering = params.filtering || [];
      params.filtering.push({ field: 'campaign_id', operator: 'EQUAL', value: campaignId });
    }

    const fields = ['id', 'name', 'status', 'effective_status', 'adset_id', 'campaign_id', 'creative', 'created_time', 'updated_time'];

    const ads = await adAccount.getAds(fields, params);

    const formattedAds = ads.map((ad: any) => ({
      id: ad.id,
      name: ad._data?.name,
      status: ad._data?.status,
      effectiveStatus: ad._data?.effective_status,
      adSetId: ad._data?.adset_id,
      campaignId: ad._data?.campaign_id,
      creativeId: ad._data?.creative?.id,
      createdTime: ad._data?.created_time,
      updatedTime: ad._data?.updated_time
    }));

    return {
      success: true,
      ads: formattedAds
    };
  } catch (error) {
    console.error('Chyba při získávání reklam:', error);
    return {
      success: false,
      message: `Chyba při získávání reklam: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};
