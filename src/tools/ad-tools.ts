import { AdAccount, Ad } from 'facebook-nodejs-business-sdk';
import fs from 'fs';
import path from 'path';
import { config, initFacebookSdk } from '../config.js';

// Helper: instance aktivního reklamního účtu (z auth vrstvy přes config)
const getAdAccount = (): AdAccount => {
  if (!config.facebookAccountId) {
    throw new Error('Není k dispozici reklamní účet. V Claude řekni: „Připoj Facebook účet".');
  }
  return new AdAccount(config.facebookAccountId);
};

// Helper: ujisti se, že SDK má aktuální token (funguje i po přihlášení za běhu)
const ensureSdk = () => {
  if (!initFacebookSdk()) {
    throw new Error('Nejsi přihlášen k Facebooku. V Claude řekni: „Připoj Facebook účet" nebo „Nastav Facebook token: EAA...".');
  }
};

// Helper: čitelná chybová hláška z Facebook API
const formatError = (error: unknown, prefix: string): string => {
  let msg = `${prefix}: ${error instanceof Error ? error.message : 'Neznámá chyba'}`;
  if (error && typeof error === 'object' && 'response' in error) {
    const fb = (error as any).response?.data?.error;
    if (fb) {
      msg = `Facebook API Error (${fb.code}): ${fb.message}.`
        + `${fb.error_user_title ? ` (${fb.error_user_title})` : ''} ${fb.error_user_msg || ''}`;
    }
  }
  return msg;
};

// --- Nahrání reklamního média (obrázek → image_hash, video → video_id) ---
export const uploadAdMedia = async (filePath: string, description?: string) => {
  try {
    ensureSdk();
    if (!filePath) throw new Error('Chybí cesta k souboru (file_path).');
    if (!fs.existsSync(filePath)) throw new Error(`Soubor nenalezen: ${filePath}`);

    const adAccount = getAdAccount();
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      const buffer = fs.readFileSync(filePath);
      const image: any = await adAccount.createAdImage([], {
        bytes: buffer.toString('base64'),
        name: fileName,
      });
      const hash = image?.hash ?? image?._data?.hash ?? image?._data?.images?.[fileName]?.hash;
      const id = image?.id ?? image?._data?.id;
      return { success: true, type: 'image', imageHash: hash, id,
        message: `Obrázek "${fileName}" nahrán. image_hash: ${hash}` };
    }

    if (['.mp4', '.mov', '.avi', '.wmv', '.m4v'].includes(ext)) {
      const video: any = await adAccount.createAdVideo([], {
        source: filePath,
        name: fileName,
        description: description || 'Uploaded video',
      });
      const id = video?.id ?? video?._data?.id;
      return { success: true, type: 'video', videoId: id,
        message: `Video "${fileName}" nahráno. video_id: ${id} (zpracování může chvíli trvat).` };
    }

    throw new Error(`Nepodporovaný typ souboru: ${ext}. Použij obrázek (jpg, png, gif) nebo video (mp4, mov, ...).`);
  } catch (error) {
    return { success: false, message: formatError(error, 'Chyba při nahrávání média') };
  }
};

// --- Vytvoření reklamní kreativy ---
export const createAdCreative = async (name: string, objectStorySpec: any) => {
  try {
    ensureSdk();
    if (!name || !objectStorySpec) {
      throw new Error('Chybí povinné parametry: name a object_story_spec.');
    }
    const adAccount = getAdAccount();
    const creative: any = await adAccount.createAdCreative([], {
      name,
      object_story_spec: objectStorySpec,
    });
    const id = creative?.id ?? creative?._data?.id;
    return { success: true, creativeId: id, message: `Kreativa "${name}" vytvořena. ID: ${id}` };
  } catch (error) {
    return { success: false, message: formatError(error, 'Chyba při vytváření kreativy') };
  }
};

// --- Vytvoření reklamy (Ad) v dané sadě; default PAUSED, nikdy nespouštět bez potvrzení ---
export const createAd = async (
  adsetId: string,
  name: string,
  creativeId: string,
  status: string = 'PAUSED'
) => {
  try {
    ensureSdk();
    if (!adsetId || !name || !creativeId) {
      throw new Error('Chybí povinné parametry: adset_id, name a creative_id.');
    }
    const adAccount = getAdAccount();
    const ad: any = await adAccount.createAd([], {
      adset_id: adsetId,
      name,
      status,
      creative: { creative_id: creativeId },
    });
    const id = ad?.id ?? ad?._data?.id;
    return { success: true, adId: id, status,
      message: `Reklama "${name}" vytvořena. ID: ${id}, status: ${status}` };
  } catch (error) {
    return { success: false, message: formatError(error, 'Chyba při vytváření reklamy') };
  }
};

// --- Úprava reklamy (název / status / kreativa) ---
export const updateAd = async (
  adId: string,
  updates: { name?: string; status?: string; creativeId?: string }
) => {
  try {
    ensureSdk();
    if (!adId) throw new Error('Chybí ad_id.');
    const params: any = {};
    if (updates.name) params.name = updates.name;
    if (updates.status) params.status = updates.status;
    if (updates.creativeId) params.creative = { creative_id: updates.creativeId };
    if (Object.keys(params).length === 0) {
      throw new Error('Nebyly zadány žádné změny (name / status / creativeId).');
    }
    await new Ad(adId).update([], params);
    return { success: true, adId, message: `Reklama ${adId} byla upravena.` };
  } catch (error) {
    return { success: false, message: formatError(error, 'Chyba při úpravě reklamy') };
  }
};

// --- Smazání reklamy (nevratné) ---
export const deleteAd = async (adId: string) => {
  try {
    ensureSdk();
    if (!adId) throw new Error('Chybí ad_id.');
    await new Ad(adId).delete([]);
    return { success: true, adId, message: `Reklama ${adId} byla smazána.` };
  } catch (error) {
    return { success: false, message: formatError(error, 'Chyba při mazání reklamy') };
  }
};
