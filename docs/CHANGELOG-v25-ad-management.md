# Changelog — Správa reklam: tiché no-op chyby + čtení zpět

Datum: 2026-06-22

Tahle vlna opravuje „tiché" chyby ve správě reklam (nástroje vracely „úspěšně upraveno", ale
změna se neprovedla) a doplňuje čtení stavu reklamy zpět, aby šlo změny ověřit proti realitě.
Graph/Marketing API zůstává na **v25.0**.

## 1. `update_ad` — swap kreativy byl tichý no-op (KRITICKÉ)
`update_ad({ creative_id })` vracel „upraveno", ale kreativa se nepřepnula (reklama dál servírovala
původní odkaz). Příčina je na straně Mety: **swap kreativy na existující reklamě se běžně neprovede**.

Oprava: `updateAd` přepsán na **přímý Graph API POST + read-after-write**. Po zápisu se načte
zpět `name`/`status`/`effective_status`/`creative{id}`; když se hodnota nepropíše, vrací
`success:false` se skutečným stavem (žádné optimistické echo). U creative swapu navíc poradí
založit novou reklamu přes `create_ad` (kde se kreativa nastaví při vytvoření).

## 2. Nový nástroj `get_ad` — čtení reklamy/kreativy zpět
`get_ads` vracel jen id/název/status. Nový **`get_ad`** vrací z `creative{object_story_spec,…}`:
cílový odkaz, CTA (vč. `lead_gen_form_id`), text, titulek, `video_id`/`image_hash`, thumbnail,
`effective_object_story_id`. Slouží k ověření, že změna (odkaz/text/tlačítko/creative) reálně zabrala.

## 3. Filtrování `get_ads` / `get_campaigns`
- `get_ads({ adSetId | campaignId })` filtroval přes `act_/ads` polem `adset_id`/`campaign_id`,
  což Graph API nepodporuje (chyba `#100` / 0 výsledků). Teď se tahá z **edge**
  `AdSet.getAds` / `Campaign.getAds`. Status se filtruje lokálně.
- `get_campaigns({ status })` — Graph API nepodporuje `filtering` na `status` operací EQUAL;
  status se teď filtruje **lokálně** po načtení.

## 4. Video/action metriky v insightech
`video_thruplay_watched_actions`, `video_avg_time_watched_actions` a podobná pole Meta vrací jako
`[{action_type, value}]` a vypisovala se jako `[object Object]`. Nový helper `serializeInsightValue`
je rozbalí na číslo (u více akcí součet + rozpad). Zapojeno do campaign/adset/ad/account insights.

## 5. „Zbývající rozpočet" v `get_campaign_details`
Meta pole `budget_remaining` kolísalo nelogicky. Odstraněno; místo něj se vrací `spentToday`
(z insights `date_preset=today`) a `remainingToday` = denní rozpočet − dnešní spend.

## Ostatní
- ad-tools `GRAPH_VERSION` default zvednut z `v23.0` na **`v25.0`** (sjednocení s ostatkem serveru).

## Build & ověření
`dist/` přegenerován (`tsc`, bez chyb). Ověřeno živě: `get_ad` vrací odkaz/CTA/kreativu,
`get_ads` přes campaign/adset edge vrací reklamy, `update_ad` zápis+read-after-write (round-trip
názvu). Vše PAUSED; spuštění na ACTIVE zůstává vědomá akce uživatele.
