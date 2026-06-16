# Changelog — Lead kampaně (OUTCOME_LEADS) + zápisové nástroje

Datum: 2026-06-16

Tato vlna doplňuje server `facebook-ads` o plnou podporu **lead kampaní** (cíl `OUTCOME_LEADS`)
a opravuje zápisové nástroje, které tiše neukládaly. Graph/Marketing API zůstává na **v25.0**.

## 1. Lead pole na ad setu
`create_ad_set` umí dvě nová volitelná pole propsaná 1:1 do Marketing API:
- `promotedObject` → `promoted_object` (web konverze `{ pixel_id, custom_event_type }`,
  instant formulář `{ page_id }`)
- `destinationType` → `destination_type` (`WEBSITE`, `ON_AD`, `MESSENGER`, `PHONE_CALL`, `INSTAGRAM_DIRECT`)

Doplněna doporučená validace (OFFSITE_CONVERSIONS ⇒ pixel_id + custom_event_type/custom_conversion_id
+ WEBSITE; LEAD_GENERATION/QUALITY_LEAD ⇒ page_id + ON_AD). Objektové parametry (`promotedObject`,
`targeting`) se v handleru **parsují z JSON stringu**, pokud je klient pošle jako text.

**Rozpočet u CBO:** ad set rozpočet už nevyžaduje; když má parent kampaň rozpočet (CBO),
ad-set rozpočet se do API **vůbec neposílá** (dědí se z kampaně) — jinak Meta vrací `Invalid parameter`.

## 2. Nové nástroje
Nový modul `src/tools/leadform-tools.ts`:
- `create_lead_form` — `POST /{page_id}/leadgen_forms` (page token), vrací `lead_gen_form_id`
- `get_lead_forms` — `id`, `name`, `status`, `leads_count`
- `get_pixels` — `GET /act_<id>/adspixels` → Pixel ID pro `promoted_object`

`create_adcreative` má v popisu příklady CTA pro instant formulář (`lead_gen_form_id`) i web (`LEARN_MORE` + `link`).

## 3. Plná diagnostika chyb
Nový sdílený `src/tools/fb-error.ts` (`formatFbError`) vytahuje celou Graph API chybu napříč tvary
(SDK `FacebookRequestError` má tělo v `error.response`, axios, raw fetch): `code`/`error_subcode`,
`type`, `error_user_title`, `error_user_msg`, `error_data`, `fbtrace_id`. Zapojeno do
`adset-tools`, `ad-tools`, `campaign-tools` i `leadform-tools` — konec ladění poslepu.

## 4. Bid strategie kampaně
`update_campaign` má volitelný `bidStrategy` (`LOWEST_COST_WITHOUT_CAP` / `LOWEST_COST_WITH_BID_CAP` /
`COST_CAP`). `LOWEST_COST_WITHOUT_CAP` = bez capu (ad set nepotřebuje `bidAmount`); cap strategie
vyžadují `bidAmount` na ad setu (chyba `100/1815857`).

## 5. Oprava zápisových nástrojů (no-op)
`update_adset` a `update_campaign` volaly SDK `update(params)` přes **globální default API, které
tyhle funkce neinicializují tokenem** → POST tiše neodešel, ale vrátily optimistické „success".
Obě přepsány na **syrový Graph API POST s explicitním tokenem + read-after-write**: po zápisu se
načte reálný stav (`name`/`status`/`effective_status`, u kampaně i `bid_strategy`) a při nepropsání
se vrací `success:false` se skutečným stavem (žádné falešné echo). Ověřeno změnou názvu (projeví se v get).

## 6. Build
`dist/` přegenerován (`tsc`, bez chyb). Po restartu serveru přibývají nástroje
`create_lead_form`, `get_lead_forms`, `get_pixels`, `update_adset`.

## 7. Poznámky
- Citlivé soubory (`tokens.json`, `fb-config.json`, `.env`) zůstávají v `.gitignore`.
- Vše se zakládá/přepíná jako `PAUSED`; spuštění na `ACTIVE` je vědomá akce uživatele.
