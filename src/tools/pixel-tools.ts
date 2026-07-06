// Správa Meta Pixelů – tvorba, úprava (read-after-write), detail a statistiky událostí.
// Výpis pixelů účtu zůstává v leadform-tools (get_pixels).
import { graphGet, graphPost, requireActId } from './fb-graph.js';
import { formatFbError } from './fb-error.js';

const PIXEL_FIELDS = 'id,name,code,creation_time,last_fired_time,is_unavailable,data_use_setting';

export const createPixel = async (name: string) => {
  try {
    if (!name) throw new Error('Chybí název pixelu (name).');
    const act = requireActId();
    const d = await graphPost(`${act}/adspixels`, { name });
    return { success: true, pixelId: d.id, message: `Pixel "${name}" vytvořen. Pixel ID: ${d.id}` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při vytváření pixelu') }; }
};

export const updatePixel = async (pixelId: string, name: string) => {
  try {
    if (!pixelId || !name) throw new Error('Chybí pixel_id nebo name.');
    await graphPost(pixelId, { name });
    // Read-after-write – ověř, že se název propsal
    const v = await graphGet(pixelId, { fields: 'id,name' });
    if (v.name !== name) {
      return { success: false, message: `Úprava pixelu se nepropsala (požadováno "${name}", je "${v.name}").` };
    }
    return { success: true, pixelId, message: `Pixel ${pixelId} přejmenován na "${v.name}".` };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při úpravě pixelu') }; }
};

export const getPixel = async (pixelId: string) => {
  try {
    if (!pixelId) throw new Error('Chybí pixel_id.');
    const d = await graphGet(pixelId, { fields: PIXEL_FIELDS });
    return {
      success: true,
      pixel: {
        id: d.id, name: d.name,
        creationTime: d.creation_time || null,
        lastFiredTime: d.last_fired_time || null,
        isUnavailable: d.is_unavailable ?? null,
        dataUseSetting: d.data_use_setting || null,
      },
      message: `Pixel ${d.id} ("${d.name}") – naposledy vystřelil: ${d.last_fired_time || 'nikdy/neznámo'}.`,
    };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při čtení pixelu') }; }
};

// Statistiky událostí pixelu. aggregation: event (default), device_type, host, url, pixel_fire, browser_type, ...
export const getPixelStats = async (pixelId: string, aggregation = 'event') => {
  try {
    if (!pixelId) throw new Error('Chybí pixel_id.');
    const d = await graphGet(`${pixelId}/stats`, { aggregation });
    const rows: { key: string; count: number }[] = [];
    for (const bucket of d.data || []) {
      for (const item of bucket.data || []) {
        rows.push({ key: item.value, count: item.count });
      }
    }
    // Sečti přes časové intervaly na jeden řádek per hodnota
    const totals = new Map<string, number>();
    rows.forEach(r => totals.set(r.key, (totals.get(r.key) || 0) + r.count));
    const summary = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => ({ key: k, count: c }));
    return {
      success: true, aggregation, stats: summary,
      message: summary.length
        ? `Statistiky pixelu ${pixelId} (${aggregation}): ` + summary.map(s => `${s.key}=${s.count}`).join(', ')
        : `Pixel ${pixelId} nemá v posledním období žádné události.`,
    };
  } catch (e) { return { success: false, message: formatFbError(e, 'Chyba při čtení statistik pixelu') }; }
};
