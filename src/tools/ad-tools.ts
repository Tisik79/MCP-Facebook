import { AdAccount, Ad } from 'facebook-nodejs-business-sdk';
import fs from 'fs';
import path from 'path';
import { config, initFacebookSdk, getActiveToken, getActiveAccountId } from '../config.js';

// Graph API verze pro přímá HTTP volání (lze přepsat přes env, ať drží krok se SDK)
const GRAPH_VERSION = process.env.FB_GRAPH_API_VERSION || 'v23.0';

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

// --- Přímý upload videa na /advideos (obchází nespolehlivý createAdVideo v SDK) ---
// Podporuje lokální soubor (multipart) i veřejnou URL (file_url – FB si video stáhne sám).
const uploadAdVideoDirect = async (filePathOrUrl: string, name: string, description?: string): Promise<string> => {
  const token = getActiveToken();
  if (!token) throw new Error('Chybí access token (přihlas se k Facebooku).');
  let accountId = getActiveAccountId();
  if (!accountId) throw new Error('Chybí reklamní účet.');
  if (!accountId.startsWith('act_')) accountId = `act_${accountId}`;

  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/advideos`;
  const isUrl = /^https?:\/\//i.test(filePathOrUrl);
  let res: Response;

  if (isUrl) {
    // Facebook si video stáhne z veřejné URL – nejspolehlivější cesta (žádný binární upload).
    const body = new URLSearchParams({ access_token: token, file_url: filePathOrUrl, name });
    if (description) body.append('description', description);
    res = await fetch(endpoint, { method: 'POST', body });
  } else {
    if (!fs.existsSync(filePathOrUrl)) throw new Error(`Soubor nenalezen: ${filePathOrUrl}`);
    // Multipart upload binárního souboru přes vestavěný fetch/FormData/Blob (Node 18+).
    const fd = new FormData();
    fd.append('access_token', token);
    fd.append('name', name);
    if (description) fd.append('description', description);
    fd.append('source', new Blob([fs.readFileSync(filePathOrUrl)]), name);
    res = await fetch(endpoint, { method: 'POST', body: fd });
  }

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const e = data?.error;
    throw new Error(e
      ? `Facebook API Error (${e.code}): ${e.message}.${e.error_user_msg ? ' ' + e.error_user_msg : ''}`
      : `Upload selhal (HTTP ${res.status}).`);
  }
  if (!data.id) throw new Error('Facebook nevrátil video_id.');
  return data.id as string;
};

// --- Nahrání reklamního média (obrázek → image_hash, video → video_id) ---
// file_path může být lokální cesta NEBO veřejná URL (u videa). URL je vždy bráno jako video.
export const uploadAdMedia = async (filePath: string, description?: string) => {
  try {
    ensureSdk();
    if (!filePath) throw new Error('Chybí cesta k souboru nebo URL (file_path).');

    const isUrl = /^https?:\/\//i.test(filePath);
    const pathname = isUrl ? new URL(filePath).pathname : filePath;
    const ext = path.extname(pathname).toLowerCase();
    const fileName = path.basename(pathname) || 'video.mp4';

    if (!isUrl && !fs.existsSync(filePath)) throw new Error(`Soubor nenalezen: ${filePath}`);

    // OBRÁZEK (jen lokální soubor)
    if (!isUrl && ['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      const adAccount = getAdAccount();
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
