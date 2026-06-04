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
// Helper: čitelná chybová hláška z Facebook API
const formatError = (error, prefix) => {
    let msg = `${prefix}: ${error instanceof Error ? error.message : 'Neznámá chyba'}`;
    if (error && typeof error === 'object' && 'response' in error) {
        const fb = error.response?.data?.error;
        if (fb) {
            msg = `Facebook API Error (${fb.code}): ${fb.message}.`
                + `${fb.error_user_title ? ` (${fb.error_user_title})` : ''} ${fb.error_user_msg || ''}`;
        }
    }
    return msg;
};
// --- Nahrání reklamního média (obrázek → image_hash, video → video_id) ---
const uploadAdMedia = async (filePath, description) => {
    try {
        ensureSdk();
        if (!filePath)
            throw new Error('Chybí cesta k souboru (file_path).');
        if (!fs_1.default.existsSync(filePath))
            throw new Error(`Soubor nenalezen: ${filePath}`);
        const adAccount = getAdAccount();
        const ext = path_1.default.extname(filePath).toLowerCase();
        const fileName = path_1.default.basename(filePath);
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
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
        if (['.mp4', '.mov', '.avi', '.wmv', '.m4v'].includes(ext)) {
            const video = await adAccount.createAdVideo([], {
                source: filePath,
                name: fileName,
                description: description || 'Uploaded video',
            });
            const id = video?.id ?? video?._data?.id;
            return { success: true, type: 'video', videoId: id,
                message: `Video "${fileName}" nahráno. video_id: ${id} (zpracování může chvíli trvat).` };
        }
        throw new Error(`Nepodporovaný typ souboru: ${ext}. Použij obrázek (jpg, png, gif) nebo video (mp4, mov, ...).`);
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