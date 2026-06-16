import { FacebookAdsApi } from 'facebook-nodejs-business-sdk';
import { config } from '../config.js';
import { getActivePage } from '../auth-manager.js';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

// Dynamický import node-fetch (ESM modul)
const fetchModule = import('node-fetch').then(module => module.default);

// Proměnná pro uchování instance API
let apiInstance: FacebookAdsApi;

/**
 * Zajistí, že je API inicializováno
 */
async function ensureApiInitialized() {
  if (!apiInstance) {
    if (!config.facebookAccessToken) {
      throw new Error('Facebook Access Token není nakonfigurován v config.js');
    }
    apiInstance = FacebookAdsApi.init(config.facebookAccessToken);
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
export async function create_post(content: string, link?: string, imagePath?: string): Promise<string> {
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
      const url = `https://graph.facebook.com/v25.0/${pageId}/feed`;
      const postData: any = {
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

      const data = await response.json() as { id?: string };

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
      const formData = new FormData();
      formData.append('access_token', pageAccessToken);
      formData.append('caption', content);
      formData.append('published', 'true');

      // Přidání odkazu, pokud je zadán
      if (link) {
        formData.append('link', link);
      }

      // Přidání obrázku
      formData.append('source', fs.createReadStream(imagePath));

      const url = `https://graph.facebook.com/v25.0/${endpoint}`;
      const response = await axios.post(url, formData, {
        headers: formData.getHeaders()
      });

      if (!response.data || !response.data.id) {
        throw new Error('Příspěvek s obrázkem byl vytvořen, ale nebylo vráceno ID');
      }

      console.log(`Příspěvek s obrázkem byl úspěšně vytvořen s ID: ${response.data.id}`);
      return response.data.id;
    }

    throw new Error('Neplatná kombinace parametrů');
  } catch (error) {
    console.error('Chyba při vytváření příspěvku:', error);
    throw error;
  }
}

/**
 * Získá informace o aktivní (nebo první dostupné) Facebook stránce.
 *
 * @returns Informace o stránce nebo null, pokud žádná není k dispozici
 */
async function getPageInfo(): Promise<{ id: string, access_token: string } | null> {
  // Nejprve aktivní stránka z uloženého přihlášení (tokens.json) – nevyžaduje volání API.
  const active = getActivePage();
  if (active) return { id: active.id, access_token: active.access_token };
  try {
    const url = `https://graph.facebook.com/v25.0/me/accounts?access_token=${config.facebookAccessToken}`;
    // Získání funkce fetch z dynamického importu
    const fetch = await fetchModule;
    const response = await fetch(url);
    const data = await response.json() as {
      data?: Array<{
        id: string;
        access_token: string;
      }>
    };

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
  } catch (error) {
    console.error('Chyba při získávání informací o stránce:', error);
    return null;
  }
}

/**
 * Nahraje VIDEO jako organický příspěvek na Facebook stránku přes resumable upload
 * na /{page-id}/videos s page tokenem. Výchozí published=false → video se nahraje jako
 * NEPUBLIKOVANÉ (k ruční kontrole a publikaci ve Business Suite / na stránce).
 */
export async function create_video_post(
  filePath: string,
  content: string,
  published: boolean = false
): Promise<{ videoId: string; published: boolean }> {
  if (!filePath) throw new Error('Chybí cesta k video souboru (file_path).');
  if (!fs.existsSync(filePath)) throw new Error(`Soubor nenalezen: ${filePath}`);

  const pageInfo = await getPageInfo();
  if (!pageInfo) throw new Error('Nebyla nalezena žádná Facebook stránka nebo chybí oprávnění.');
  const { id: pageId, access_token: pageToken } = pageInfo;

  const endpoint = `https://graph.facebook.com/v25.0/${pageId}/videos`;
  const fileName = filePath.split('/').pop() || 'video.mp4';
  const fileSize = fs.statSync(filePath).size;

  try {
    // 1) start – ohlásím velikost, dostanu session a offsety
    const startResp = await axios.post(
      endpoint,
      new URLSearchParams({ upload_phase: 'start', file_size: String(fileSize), access_token: pageToken })
    );
    const sessionId: string = startResp.data.upload_session_id;
    const videoId: string = startResp.data.video_id;
    let startOffset = Number(startResp.data.start_offset);
    let endOffset = Number(startResp.data.end_offset);

    // 2) transfer – chunky přesně dle offsetů od Facebooku
    const fd = fs.openSync(filePath, 'r');
    try {
      let guard = 0;
      while (startOffset < endOffset && guard < 100000) {
        guard++;
        const len = endOffset - startOffset;
        const chunk = Buffer.alloc(len);
        fs.readSync(fd, chunk, 0, len, startOffset);
        const form = new FormData();
        form.append('access_token', pageToken);
        form.append('upload_phase', 'transfer');
        form.append('upload_session_id', sessionId);
        form.append('start_offset', String(startOffset));
        form.append('video_file_chunk', chunk, { filename: fileName, contentType: 'application/octet-stream' });
        const tResp = await axios.post(endpoint, form, {
          headers: form.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
        startOffset = Number(tResp.data.start_offset);
        endOffset = Number(tResp.data.end_offset);
      }
    } finally {
      fs.closeSync(fd);
    }

    // 3) finish – předám popis a publikační stav
    const finishParams = new URLSearchParams({
      upload_phase: 'finish',
      upload_session_id: sessionId,
      access_token: pageToken,
      description: content || '',
      published: published ? 'true' : 'false',
    });
    const finResp = await axios.post(endpoint, finishParams);
    if (finResp.data && finResp.data.success === false) {
      throw new Error(`Finish fáze selhala: ${JSON.stringify(finResp.data)}`);
    }

    return { videoId, published };
  } catch (error: any) {
    const fb = error?.response?.data?.error;
    const msg = fb ? `Facebook API Error (${fb.code}): ${fb.message}` : (error?.message || 'Neznámá chyba');
    throw new Error(`Chyba při nahrávání videa na stránku: ${msg}`);
  }
}
