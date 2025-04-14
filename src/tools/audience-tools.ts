import { AdAccount, CustomAudience } from 'facebook-nodejs-business-sdk';
import { config } from '../config.js'; // Added .js extension

// Získání instance AdAccount
const getAdAccount = () => {
  // Corrected config access
  if (!config.facebookAccountId) { 
      throw new Error('Facebook Account ID není nakonfigurováno v config.js');
  }
  return new AdAccount(config.facebookAccountId); 
};

// Vytvoření vlastního publika
export const createCustomAudience = async (
  name: string,
  description: string,
  customerFileSource: string,
  subtype: string = 'CUSTOM'
) => {
  try {
    const adAccount = getAdAccount();
    
    // Připravení parametrů pro vytvoření publika
    const params = {
      name,
      description,
      customer_file_source: customerFileSource,
      subtype
    };
    
    // Vytvoření vlastního publika - pass params directly, not in array
    const audience: CustomAudience = await adAccount.createCustomAudience([], params); 
    
    return {
      success: true,
      // Access id via _data
      audienceId: audience._data?.id, 
      message: 'Vlastní publikum bylo úspěšně vytvořeno'
    };
  } catch (error) {
    console.error('Chyba při vytváření vlastního publika:', error);
    return {
      success: false,
      message: `Chyba při vytváření vlastního publika: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání seznamu vlastních publik
export const getCustomAudiences = async (limit = 10) => {
  try {
    const adAccount = getAdAccount();
    
    // Nastavení polí pro získání vlastních publik
    const fields = [
      'id', 
      'name', 
      'description', 
      'subtype', 
      'approximate_count', 
      'time_created', 
      'time_updated',
      'customer_file_source',
      'data_source',
      'rule'
    ];
    
    const params = {
      limit
    };
    
    // Získání vlastních publik
    const audiences = await adAccount.getCustomAudiences(fields, params);
    
    // Formátování výsledků - access properties via _data
    return {
      success: true,
      // Use 'any' type for audience in map to bypass type incompatibility for now
      audiences: audiences.map((audience: any) => ({ 
        id: audience.id, 
        name: audience._data?.name,
        description: audience._data?.description,
        subtype: audience._data?.subtype,
        approximateCount: audience._data?.approximate_count,
        timeCreated: audience._data?.time_created,
        timeUpdated: audience._data?.time_updated,
        customerFileSource: audience._data?.customer_file_source,
        dataSource: audience._data?.data_source,
        rule: audience._data?.rule
      }))
    };
  } catch (error) {
    console.error('Chyba při získávání vlastních publik:', error);
    return {
      success: false,
      message: `Chyba při získávání vlastních publik: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Získání detailů o konkrétním publiku
export const getCustomAudienceDetails = async (audienceId: string) => {
  try {
    // Získání objektu vlastního publika
    const customAudience = new CustomAudience(audienceId);
    
    // Načtení detailů vlastního publika
    const fields = [
      'id', 
      'name', 
      'description', 
      'subtype', 
      'approximate_count', 
      'time_created', 
      'time_updated',
      'customer_file_source',
      'data_source',
      'rule',
      'operation_status',
      'permission_for_actions'
    ];
    
    const audienceDetails = await customAudience.get(fields);
    
    // Formátování výsledku - access properties via _data
    return {
      success: true,
      audience: {
        id: audienceDetails.id, // ID is usually directly accessible
        name: audienceDetails._data?.name,
        description: audienceDetails._data?.description,
        subtype: audienceDetails._data?.subtype,
        approximateCount: audienceDetails._data?.approximate_count,
        timeCreated: audienceDetails._data?.time_created,
        timeUpdated: audienceDetails._data?.time_updated,
        customerFileSource: audienceDetails._data?.customer_file_source,
        dataSource: audienceDetails._data?.data_source,
        rule: audienceDetails._data?.rule,
        operationStatus: audienceDetails._data?.operation_status,
        permissionForActions: audienceDetails._data?.permission_for_actions
      }
    };
  } catch (error) {
    console.error('Chyba při získávání detailů vlastního publika:', error);
    return {
      success: false,
      message: `Chyba při získávání detailů vlastního publika: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Aktualizace vlastního publika
export const updateCustomAudience = async (
  audienceId: string,
  name?: string,
  description?: string
) => {
  try {
    // Získání objektu vlastního publika
    const customAudience = new CustomAudience(audienceId);
    
    // Příprava parametrů pro aktualizaci
    const params: any = {};
    
    if (name) params.name = name;
    if (description) params.description = description;
    
    // Aktualizace vlastního publika
    await customAudience.update(params);
    
    return {
      success: true,
      message: 'Vlastní publikum bylo úspěšně aktualizováno'
    };
  } catch (error) {
    console.error('Chyba při aktualizaci vlastního publika:', error);
    return {
      success: false,
      message: `Chyba při aktualizaci vlastního publika: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Odstranění vlastního publika
export const deleteCustomAudience = async (audienceId: string) => {
  try {
    // Získání objektu vlastního publika
    const customAudience = new CustomAudience(audienceId);
    
    // Odstranění vlastního publika - pass empty fields array
    await customAudience.delete([]); 
    
    return {
      success: true,
      message: 'Vlastní publikum bylo úspěšně odstraněno'
    };
  } catch (error) {
    console.error('Chyba při odstraňování vlastního publika:', error);
    return {
      success: false,
      message: `Chyba při odstraňování vlastního publika: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Vytvoření lookalike audience (podobného publika) na základě existujícího publika
export const createLookalikeAudience = async (
  sourceAudienceId: string, 
  name: string, 
  description: string,
  country: string,
  ratio: number = 0.01 // 1% jako výchozí hodnota
) => {
  try {
    const adAccount = getAdAccount();
    
    // Validace poměru (ratio musí být mezi 0.01 a 0.20)
    if (ratio < 0.01 || ratio > 0.2) {
      return {
        success: false,
        message: 'Poměr lookalike audience musí být mezi 0.01 a 0.2 (1% až 20%)'
      };
    }
    
    // Parametry pro vytvoření lookalike audience
    const params = {
      name,
      description,
      origin_audience_id: sourceAudienceId,
      subtype: 'LOOKALIKE',
      lookalike_spec: JSON.stringify({
        country,
        ratio,
        type: 'CUSTOM_AUDIENCE'
      })
    };
    
    // Vytvoření lookalike audience - pass params directly
    const result: CustomAudience = await adAccount.createCustomAudience([], params); 
    
    return {
      success: true,
      // Access id via _data
      audienceId: result._data?.id, 
      message: 'Lookalike audience bylo úspěšně vytvořeno'
    };
  } catch (error) {
    console.error('Chyba při vytváření lookalike audience:', error);
    return {
      success: false,
      message: `Chyba při vytváření lookalike audience: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};

// Přidání uživatelů do vlastního publika
export const addUsersToCustomAudience = async (
  audienceId: string,
  users: Array<{schema: string, data: string[]}>,
  type: string = 'EMAIL'
) => {
  try {
    // Získání objektu vlastního publika
    const customAudience = new CustomAudience(audienceId);
    
    // Příprava parametrů pro přidání uživatelů
    const params = {
      payload: {
        schema: type.toLowerCase(),
        data: users.map(user => user.data)
      }
    };
    
    // Přidání uživatelů do vlastního publika - Method addUsers does not exist
    // await customAudience.addUsers(params); // Commenting out for now
    console.warn(`Metoda addUsers není dostupná v aktuální verzi SDK nebo typových definicích. Přidávání uživatelů je třeba implementovat jinak.`);
    
    // Returning success: false until implemented correctly
    return {
      success: false, // Indicate failure as the core action is commented out
      message: 'Funkce pro přidání uživatelů není momentálně implementována/podporována.' 
      // Removed duplicated success/message lines
    };
  } catch (error) {
    console.error('Chyba při přidávání uživatelů do vlastního publika:', error);
    return {
      success: false,
      message: `Chyba při přidávání uživatelů do vlastního publika: ${error instanceof Error ? error.message : 'Neznámá chyba'}`
    };
  }
};
