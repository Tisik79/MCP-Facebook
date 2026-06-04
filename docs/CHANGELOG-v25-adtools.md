# Changelog — Graph API v25.0 + nástroje pro tvorbu reklam

Datum: 2026-06-04

Tato verze sjednocuje lokální build serveru `facebook-ads` (MCP-Facebook). Povyšuje volání
Facebook Graph/Marketing API na v25.0 a doplňuje chybějící část řetězce tvorby reklam
(média → kreativa → reklama). Zároveň poprvé dostává do repozitáře konverzační vrstvu pro
přihlašování a přepínání účtů, která dosud existovala jen v lokální kopii.

## 1. Migrace na Graph API v25.0
Důvod: Meta od 9. 6. 2026 vypíná všechny verze Marketing API nižší než v24.0. Ručně psaná
volání Graphu byla na v18.0 / v19.0 a po tomto datu by přestala fungovat.

Změněné soubory (verze v URL → v25.0):
- `src/auth-manager.ts` — konstanta `GRAPH` (výměna tokenu, `/me/accounts`, `/me/adaccounts`) + OAuth dialog
- `src/setup.ts` — OAuth flow (`oauth/access_token`, `/me/accounts`, `/me/adaccounts`) + přihlašovací dialog
- `src/tools/post-tools.ts` — `/feed`, `/photos`, `/me/accounts` (bylo dokonce v18.0)

SDK `facebook-nodejs-business-sdk` zůstává na `^24.0.1` — v25 SDK zatím na npm není a v24 je
nad hranicí deprecation, takže reklamní operace přes SDK jsou v pořádku.

## 2. Nové nástroje pro tvorbu reklam
Nový modul `src/tools/ad-tools.ts` napojený na aktivní účet a token (`config` + `initFacebookSdk`),
zaregistrovaný v `src/index.ts`:
- `upload_ad_media` — nahraje obrázek (→ `image_hash`) nebo video (→ `video_id`)
- `create_adcreative` — vytvoří kreativu z `object_story_spec`
- `create_ad` — vytvoří reklamu v ad setu (výchozí status `PAUSED`)
- `update_ad` — úprava reklamy (název / status / kreativa)
- `delete_ad` — smazání reklamy (nevratné)

Tím je řetězec kompletní:
`create_campaign → create_ad_set → upload_ad_media → create_adcreative → create_ad`

Bezpečnost: `create_ad` vytváří reklamu vždy jako `PAUSED`; spuštění (`ACTIVE`) je vědomá akce.

## 3. Build
`dist/` přegenerován (`tsc`, build bez chyb). Server se po restartu Claude Desktopu nahodí
s 25 nástroji.

## 4. Poznámky
- Citlivé soubory (`tokens.json`, `fb-config.json`, `.env`) jsou v `.gitignore` a do repa nejdou.
- Doprovodný skill „facebook-reklamy" (mimo tento repozitář, v `~/.claude/skills/`) popisuje
  workflow tvorby a vyhodnocování reklam včetně video metrik (ThruPlay, dosledování).
