# Facebook Ads MCP Server

MCP server pro správu Facebook reklam přímo z Claude AI. Bez ručního hledání tokenů — stačí se jednou přihlásit Facebookem.

## Funkce

- Správa kampaní (vytváření, úpravy, mazání)
- Ad Sets a jednotlivé reklamy
- Analytika a insights
- Vlastní publika a lookalike
- Příspěvky na stránkách
- Automatická správa tokenů (page tokeny jsou trvalé)

## Instalace

### Požadavky
- Node.js 18+
- Claude Desktop

### 1. Klonuj repozitář

```bash
git clone https://github.com/Tisik79/MCP-Facebook.git
cd MCP-Facebook
npm install
npm run build
```

### 2. Přidej do Claude Desktop

Otevři konfigurační soubor Claude Desktop:
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Přidej:

```json
{
  "mcpServers": {
    "facebook-ads": {
      "command": "node",
      "args": ["/CESTA/K/MCP-Facebook/dist/index.js"]
    }
  }
}
```

### 3. První spuštění — setup za 5 minut

Při prvním startu Claude Desktop tě průvodce provede vytvořením vlastní Facebook App:

```
╔══════════════════════════════════════════════════════╗
║       Facebook Ads MCP Server – první spuštění      ║
╚══════════════════════════════════════════════════════╝

Potřebuješ vlastní Facebook App (zdarma, 5 minut).
Otevřu návod v prohlížeči...

Postup:
  1. Klikni "Vytvořit aplikaci"
  2. Zvol typ: "Business"
  3. Zadej libovolný název (např. "Moje reklamy")
  4. Po vytvoření jdi do Nastavení → Základní
  5. Zkopíruj App ID a App Secret
  6. Přidej produkt "Facebook Login" a nastav:
     Valid OAuth Redirect URIs: http://localhost:3456/auth/callback
  7. V Základním nastavení přidej do App Domains: localhost
```

Po zadání App ID a Secret se automaticky otevře prohlížeč → přihlásíš se Facebookem → hotovo.

### Přihlášení znovu / přidání stránek

```bash
node dist/index.js login
```

## Použití v Claude

```
"Zobraz mé aktivní kampaně"
"Vytvoř kampaň pro SvobodnéReality s denním rozpočtem 200 Kč"
"Jaký je výkon reklam za poslední měsíc?"
"Přidej příspěvek na stránku XY"
```

## Dostupné nástroje

| Nástroj | Popis |
|---------|-------|
| `list_connected_accounts` | Zobrazí propojené stránky a účty |
| `get_campaigns` | Seznam kampaní |
| `create_campaign` | Vytvoření nové kampaně |
| `update_campaign` | Úprava kampaně |
| `get_campaign_insights` | Analytika kampaně |
| `get_adsets` | Seznam Ad Sets |
| `create_ad_set` | Vytvoření Ad Set (vč. lead polí `promotedObject` / `destinationType`) |
| `update_adset` | Úprava Ad Set (název / status) — reálný zápis + read-after-write |
| `get_ads` | Seznam reklam |
| `create_lead_form` | Vytvoření instant lead formuláře na stránce |
| `get_lead_forms` | Seznam lead formulářů (`id`, `name`, `status`, `leads_count`) |
| `get_pixels` | Pixely účtu (`id`, `name`) pro `promoted_object` |
| `get_audiences` | Vlastní publika |
| `create_custom_audience` | Vytvoření publika |
| `create_lookalike_audience` | Lookalike publikum |
| `create_post` | Příspěvek na stránku |

## Lead kampaně (OUTCOME_LEADS)

Sběr leadů má dvě cesty; obě potřebují na ad setu `promotedObject` + `destinationType`:

- **Webové konverze** — `optimizationGoal=OFFSITE_CONVERSIONS`, `destinationType=WEBSITE`,
  `promotedObject={ pixel_id, custom_event_type: "LEAD" }` (Pixel ID zjistíš přes `get_pixels`).
- **Instant formulář** — `optimizationGoal=LEAD_GENERATION`, `destinationType=ON_AD`,
  `promotedObject={ page_id }`, kreativa s `call_to_action.value.lead_gen_form_id`
  (formulář založíš přes `create_lead_form`).

Bez `promotedObject` + `destinationType` vrací Meta „Invalid parameter". U účtů s rozpočtem
na úrovni kampaně (CBO) se **na ad setu rozpočet neuvádí** — dědí se z kampaně. Pokud kampaň
používá cap strategii (`LOWEST_COST_WITH_BID_CAP`), ad set vyžaduje `bidAmount`; jinak nastav
kampani `bidStrategy=LOWEST_COST_WITHOUT_CAP`.

## Licence

MIT
