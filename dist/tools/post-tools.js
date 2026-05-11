"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_post = create_post;
const facebook_nodejs_business_sdk_1 = require("facebook-nodejs-business-sdk");
const config_js_1 = require("../config.js");
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
// Dynamický import node-fetch (ESM modul)
const fetchModule = import('node-fetch').then(module => module.default);
// Proměnná pro uchování instance API
let apiInstance;
/**
 * Zajistí, že je API inicializováno
 */
async function ensureApiInitialized() {
    if (!apiInstance) {
        if (!config_js_1.config.facebookAccessToken) {
            throw new Error('Facebook Access Token není nakonfigurován v config.js');
        }
        apiInstance = facebook_nodejs_business_sdk_1.FacebookAdsApi.init(config_js_1.config.facebookAccessToken);
    }
    return apiInstance;
}
/**
 * Vytvoří nový příspěvek na Facebook stránce.
 *
 * @param content Obsah příspěvku
 * @param link Volitelný odkaz, který bude součástí příspěvku
 * @param imagePath Volitelná cesta k obrázku, který bude součástí příspěvku
 * @returns ID vytvořeného příspěvku
 */
async function create_post(content, link, imagePath) {
    try {
        await ensureApiInitialized();
        // Získání informací o stránce
        const pageInfo = await getPageInfo();
        if (!pageInfo) {
            throw new Error('Nebyla nalezena žádná Facebook stránka nebo nemáte dostatečná oprávnění.');
        }
        const { id: pageId, access_token: pageAccessToken } = pageInfo;
        // Pro textový příspěvek (případně s odkazem)
        if (!imagePath) {
            // Vytvoření příspěvku pomocí Graph API
            const url = `https://graph.facebook.com/v18.0/${pageId}/feed`;
            const postData = {
                message: content,
                access_token: pageAccessToken
            };
            // Přidání odkazu, pokud je zadán
            if (link) {
                postData.link = link;
            }
            // Získání funkce fetch z dynamického importu
            const fetch = await fetchModule;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`Facebook API Error: ${JSON.stringify(data)}`);
            }
            if (!data.id) {
                throw new Error('Příspěvek byl vytvořen, ale nebylo vráceno ID');
            }
            console.log(`Příspěvek byl úspěšně vytvořen s ID: ${data.id}`);
            return data.id;
        }
        // Pro příspěvek s obrázkem
        if (imagePath) {
            const endpoint = `${pageId}/photos`;
            const formData = new form_data_1.default();
            formData.append('access_token', pageAccessToken);
            formData.append('caption', content);
            formData.append('published', 'true');
            // Přidání odkazu, pokud je zadán
            if (link) {
                formData.append('link', link);
            }
            // Přidání obrázku
            formData.append('source', fs_1.default.createReadStream(imagePath));
            const url = `https://graph.facebook.com/v18.0/${endpoint}`;
            const response = await axios_1.default.post(url, formData, {
                headers: formData.getHeaders()
            });
            if (!response.data || !response.data.id) {
                throw new Error('Příspěvek s obrázkem byl vytvořen, ale nebylo vráceno ID');
            }
            console.log(`Příspěvek s obrázkem byl úspěšně vytvořen s ID: ${response.data.id}`);
            return response.data.id;
        }
        throw new Error('Neplatná kombinace parametrů');
    }
    catch (error) {
        console.error('Chyba při vytváření příspěvku:', error);
        throw error;
    }
}
/**
 * Získá informace o první dostupné Facebook stránce
 *
 * @returns Informace o stránce nebo null, pokud žádná není k dispozici
 */
async function getPageInfo() {
    try {
        const url = `https://graph.facebook.com/v18.0/me/accounts?access_token=${config_js_1.config.facebookAccessToken}`;
        // Získání funkce fetch z dynamického importu
        const fetch = await fetchModule;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Facebook API Error: ${JSON.stringify(data)}`);
        }
        if (!data.data || data.data.length === 0) {
            return null;
        }
        // Vrátíme první stránku
        return {
            id: data.data[0].id,
            access_token: data.data[0].access_token
        };
    }
    catch (error) {
        console.error('Chyba při získávání informací o stránce:', error);
        return null;
    }
}
//# sourceMappingURL=post-tools.js.map