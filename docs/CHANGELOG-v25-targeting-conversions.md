# Changelog — Targeting research, pixely a konverzní vrstva (20 nových nástrojů)

Datum: 2026-07-06

Tahle vlna rozšiřuje server z 31 na **51 nástrojů** o targeting research, správu pixelů,
Conversions API a vlastní/offline konverze. Graph/Marketing API zůstává na **v25.0**.

> **Poděkování / zdroj inspirace:** rozsah této sady nástrojů je inspirován projektem
> [Draivix/aidvertaiser](https://github.com/Draivix/aidvertaiser) (David Strejc, MIT) —
> multiplatformním MCP serverem s 232 nástroji. Implementace je psaná od nuly ve stylu
> tohoto serveru (raw Graph API + plná diagnostika chyb + read-after-write), kód přebírán nebyl.

## 1. Targeting research (5) — `targeting-tools.ts`
- `search_interests` — hledání zájmů (id, velikost publika, cesta)
- `get_interest_suggestions` — návrhy podobných zájmů
- `search_behaviors` — kategorie chování
- `search_geo_locations` — geo klíče pro `targeting.geo_locations` (region/city/zip)
- `estimate_audience_size` — odhad MAU pro daný targeting (`/delivery_estimate`)

Ověřeno živě: Moravskoslezský kraj = region key **819**; cílení Ostrava 25 km / 27–65 ≈ 560–659 tis. MAU.

## 2. Správa pixelů (4) — `pixel-tools.ts`
- `create_pixel`, `update_pixel` (read-after-write), `get_pixel` (detail vč. `last_fired_time`),
  `get_pixel_stats` (agregace event/device/url… — kontrola, že eventy reálně tečou)

## 3. Conversions API (2) — `conversion-tools.ts`
- `send_conversion_event`, `send_conversion_events_batch` — server-side eventy na `/{pixel_id}/events`
- PII (`em`, `ph`, `fn`, …) se **automaticky normalizuje a hashuje SHA-256**, pokud už hashované není
- `event_id` pro deduplikaci s browser pixelem, `test_event_code` pro bezpečné testování

## 4. Vlastní konverze (5)
- `get_custom_conversions`, `get_custom_conversion`, `create_custom_conversion`
  (`custom_event_type` NEBO `rule`; vrací ID použitelné jako `custom_conversion_id`
  v `promoted_object` lead kampaní), `update_custom_conversion` (read-after-write),
  `delete_custom_conversion`

## 5. Offline konverze (3)
- `get_offline_conversion_sets`, `create_offline_conversion_set` (Business ID z env
  `FACEBOOK_BUSINESS_ID`), `upload_offline_conversions` (match_keys s auto-hashem) —
  např. nahrání „lead se stal klientem" z CRM

## 6. Kreativa (1)
- `update_adcreative` — jen `name`/`status`; obsah kreativy je u Mety immutable
  (nástroj to explicitně říká a odkazuje na `create_adcreative`)

## Technicky
- Nový sdílený modul `fb-graph.ts` (`graphGet/Post/Delete`, `parseIfString`, `requireToken/ActId`)
- Vše s plnou diagnostikou chyb (`formatFbError`) a v češtině
- Build `tsc` bez chyb; smoke test: 51 nástrojů registrováno, živé read-only testy prošly
