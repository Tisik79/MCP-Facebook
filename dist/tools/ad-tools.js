"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAd = exports.updateAd = exports.createAd = exports.createAdCreative = exports.uploadAdMedia = void 0;
const facebook_nodejs_business_sdk_1 = require("facebook-nodejs-business-sdk");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_js_1 = require("../config.js");
const fb_error_js_1 = require("./fb-error.js");
// Graph API verze pro přímá HTTP volání (lze přepsat přes env, ať drží krok se SDK)
const GRAPH_VERSION = process.env.FB_GRAPH_API_VERSION || 'v23.0';
// Helper: instance aktivního reklamního účtu (z auth vrstvy přes config)
const getAdAccount = () => {
    if (!config_js_1.config.facebookAccountId) {
        throw new Error('Není k dispozici reklamní účet. V Claude řekni: „Připoj Facebook účet".');
    }
    return new facebook_nodejs_business_sdk_1.AdAccount(config_js_1.config.facebookAccountId);
};
// Helper: ujisti se, že SDK má aktuální token (funguje i po přihlášení za běhu)
const ensureSdk = () => {
    if (!(0, config_js_1.initFacebookSdk)()) {
        throw new Error('Nejsi přihlášen k Facebooku. V Claude řekni: „Připoj Facebook účet" nebo „Nastav Facebook token: EAA...".');
    }
};
// Helper: čitelná chybová hláška z Facebook API (sdílený formatter s plnou diagnostikou)
const formatError = (error, prefix) => (0, fb_error_js_1.formatFbError)(error, prefix);
// --- Přímý upload videa na /advideos (obchází nespolehlivý createAdVideo v SDK) ---
// Podporuje lokální soubor (multipart) i veřejnou URL (file_url – FB si video stáhne sám).
const uploadAdVideoDirect = async (filePathOrUrl, name, description) => {
    const token = (0, config_js_1.getActiveToken)();
    if (!token)
        throw new Error('Chybí access token (přihlas se k Facebooku).');
    let accountId = (0, config_js_1.getActiveAccountId)();
    if (!accountId)
        throw new Error('Chybí reklamní účet.');
    if (!accountId.startsWith('act_'))
        accountId = `act_${accountId}`;
    const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/advideos`;
    const isUrl = /^https?:\/\//i.test(filePathOrUrl);
    let res;
    if (isUrl) {
        // Facebook si video stáhne z veřejné URL – nejspolehlivější cesta (žádný binární upload).
        const body = new URLSearchParams({ access_token: token, file_url: filePathOrUrl, name });
        if (description)
            body.append('description', description);
        res = await fetch(endpoint, { method: 'POST', body });
    }
    else {
        if (!fs_1.default.existsSync(filePathOrUrl))
            throw new Error(`Soubor nenalezen: ${filePathOrUrl}`);
        // Multipart upload binárního souboru přes vestavěný fetch/FormData/Blob (Node 18+).
        const fd = new FormData();
        fd.append('access_token', token);
        fd.append('name', name);
        if (description)
            fd.append('description', description);
        fd.append('source', new Blob([fs_1.default.readFileSync(filePathOrUrl)]), name);
        res = await fetch(endpoint, { method: 'POST', body: fd });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
        const e = data?.error;
        throw new Error(e
            ? `Facebook API Error (${e.code}): ${e.message}.${e.error_user_msg ? ' ' + e.error_user_msg : ''}`
            : `Upload selhal (HTTP ${res.status}).`);
    }
    if (!data.id)
        throw new Error('Facebook nevrátil video_id.');
    return data.id;
};
// --- Nahrání reklamního média (obrázek → image_hash, video → video_id) ---
// file_path může být lokální cesta NEBO veřejná URL (u videa). URL je vždy bráno jako video.
const uploadAdMedia = async (filePath, description) => {
    try {
        ensureSdk();
        if (!filePath)
            throw new Error('Chybí cesta k souboru nebo URL (file_path).');
        const isUrl = /^https?:\/\//i.test(filePath);
        const pathname = isUrl ? new URL(filePath).pathname : filePath;
        const ext = path_1.default.extname(pathname).toLowerCase();
        const fileName = path_1.default.basename(pathname) || 'video.mp4';
        if (!isUrl && !fs_1.default.existsSync(filePath))
            throw new Error(`Soubor nenalezen: ${filePath}`);
        // OBRÁZEK (jen lokální soubor)
        if (!isUrl && ['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            const adAccount = getAdAccount();
            const buffer = fs_1.default.readFileSync(filePath);
            const image = await adAccount.createAdImage([], {
                bytes: buffer.toString('base64'),
                name: fileName,
            });
            const hash = image?.hash ?? image?._data?.hash ?? image?._data?.images?.[fileName]?.hash;
            const id = image?.id ?? image?._data?.id;
            return { success: true, type: 'image', imageHash: hash, id,
                message: `Obrázek "${fileName}" nahrán. image_hash: ${hash}` };
        }
        if (isUrl && ['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            throw new Error('Obrázek přes URL zatím nepodporován – stáhni ho lokálně a nahraj jako soubor. URL je podporována jen pro video.');
        }
        // VIDEO (lokální soubor přes multipart, nebo veřejná URL přes file_url)
        if (isUrl || ['.mp4', '.mov', '.avi', '.wmv', '.m4v', '.webm'].includes(ext)) {
            const videoId = await uploadAdVideoDirect(filePath, fileName, description);
            return { success: true, type: 'video', videoId,
                message: `Video nahráno na /advideos. video_id: ${videoId}. `
                    + `Pozor: před použitím v kreativě počkej, až se zpracuje `
                    + `(GET /${videoId}?fields=status → video_status: "ready"). `
                    + `V object_story_spec použij video_data { video_id, image_url (povinný náhled), call_to_action }.` };
        }
        throw new Error(`Nepodporovaný typ: ${ext || '(bez přípony)'}. Použij obrázek (jpg, png, gif) nebo video (mp4, mov, webm, ...), případně veřejnou URL videa.`);
    }
    catch (error) {
        return { success: false, message: formatError(error, 'Chyba při nahrávání média') };
    }
};
exports.uploadAdMedia = uploadAdMedia;
// --- Vytvoření reklamní kreativy ---
const createAdCreative = async (name, objectStorySpec) => {
    try {
        ensureSdk();
        if (!name || !objectStorySpec) {
            throw new Error('Chybí povinné parametry: name a object_story_spec.');
        }
        const adAccount = getAdAccount();
        const creative = await adAccount.createAdCreative([], {
            name,
            object_story_spec: objectStorySpec,
        });
        const id = creative?.id ?? creative?._data?.id;
        return { success: true, creativeId: id, message: `Kreativa "${name}" vytvořena. ID: ${id}` };
    }
    catch (error) {
        return { success: false, message: formatError(error, 'Chyba při vytváření kreativy') };
    }
};
exports.createAdCreative = createAdCreative;
// --- Vytvoření reklamy (Ad) v dané sadě; default PAUSED, nikdy nespouštět bez potvrzení ---
const createAd = async (adsetId, name, creativeId, status = 'PAUSED') => {
    try {
        ensureSdk();
        if (!adsetId || !name || !creativeId) {
            throw new Error('Chybí povinné parametry: adset_id, name a creative_id.');
        }
        const adAccount = getAdAccount();
        const ad = await adAccount.createAd([], {
            adset_id: adsetId,
            name,
            status,
            creative: { creative_id: creativeId },
        });
        const id = ad?.id ?? ad?._data?.id;
        return { success: true, adId: id, status,
            message: `Reklama "${name}" vytvořena. ID: ${id}, status: ${status}` };
    }
    catch (error) {
        return { success: false, message: formatError(error, 'Chyba při vytváření reklamy') };
    }
};
exports.createAd = createAd;
// --- Úprava reklamy (název / status / kreativa) ---
const updateAd = async (adId, updates) => {
    try {
        ensureSdk();
        if (!adId)
            throw new Error('Chybí ad_id.');
        const params = {};
        if (updates.name)
            params.name = updates.name;
        if (updates.status)
            params.status = updates.status;
        if (updates.creativeId)
            params.creative = { creative_id: updates.creativeId };
        if (Object.keys(params).length === 0) {
            throw new Error('Nebyly zadány žádné změny (name / status / creativeId).');
        }
        await new facebook_nodejs_business_sdk_1.Ad(adId).update([], params);
        return { success: true, adId, message: `Reklama ${adId} byla upravena.` };
    }
    catch (error) {
        return { success: false, message: formatError(error, 'Chyba při úpravě reklamy') };
    }
};
exports.updateAd = updateAd;
// --- Smazání reklamy (nevratné) ---
const deleteAd = async (adId) => {
    try {
        ensureSdk();
        if (!adId)
            throw new Error('Chybí ad_id.');
        await new facebook_nodejs_business_sdk_1.Ad(adId).delete([]);
        return { success: true, adId, message: `Reklama ${adId} byla smazána.` };
    }
    catch (error) {
        return { success: false, message: formatError(error, 'Chyba při mazání reklamy') };
    }
};
exports.deleteAd = deleteAd;
//# sourceMappingURL=ad-tools.js.map