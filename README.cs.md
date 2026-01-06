# Facebook Ads MCP Server

MCP (Model Context Protocol) server pro zadávání a vyhodnocování reklamních kampaní na Facebooku s využitím Claude AI.

## Popis

Tento MCP server poskytuje rozhraní pro komunikaci s Facebook Marketing API pomocí protokolu MCP. Umožňuje Claude AI a dalším LLM modelům pracovat s Facebook reklamami – vytvářet a spravovat kampaně, analyzovat výsledky a optimalizovat výkon.

## Funkce

- **Správa reklamních kampaní**
  - Vytváření nových kampaní
  - Získání seznamu existujících kampaní
  - Úprava parametrů kampaní
  - Odstranění kampaní

- **Analytika a reportování**
  - Získání přehledu o výkonu kampaní
  - Srovnání více kampaní
  - Analýza účtu
  - Demografická analýza publika

- **Správa publik**
  - Vytváření vlastních publik
  - Vytváření lookalike publik
  - Správa seznamů uživatelů

- **Správa příspěvků**
  - Vytváření organických příspěvků na Facebook stránkách
  - Podpora textových příspěvků, příspěvků s odkazy a příspěvků s obrázky

- **AI asistence**
  - Šablony promptů pro Claude AI
  - Analýza výkonu kampaní
  - Doporučení pro optimalizaci

## Požadavky

- Node.js (verze 18 nebo vyšší)
- Facebook Business Manager účet
- Facebook App s přístupem k Marketing API
- Přístupový token s oprávněními pro Facebook Ads API (`ads_management`, `ads_read`) a Facebook Pages API (`pages_manage_posts`)
- Claude AI nebo jiný LLM s podporou MCP

## Instalace

1. Klonujte repozitář:
```bash
git clone https://github.com/Tisik79/MCP-Facebook.git
cd MCP-Facebook
```

2. Nainstalujte závislosti:
```bash
npm install
```

3. Zkopírujte soubor `.env.example` na `.env` a upravte ho:
```bash
cp .env.example .env
```

Poté upravte soubor `.env` a vložte do něj své přístupové údaje:
```
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_ACCESS_TOKEN=your_access_token
FACEBOOK_ACCOUNT_ID=your_ad_account_id
PORT=3000
```

> **Bezpečnostní poznámka**: Nikdy neukládejte soubor `.env` do verzovacího systému. Soubor `.env` je již zahrnut v `.gitignore`.

4. Zkompilujte TypeScript:
```bash
npm run build
```

5. Spusťte server:
```bash
npm start
```

## Konfigurace pro Claude Desktop

Pro použití tohoto MCP serveru s Claude Desktop přidejte následující konfiguraci do konfiguračního souboru Claude Desktop:

```json
{
  "mcpServers": {
    "facebook-ads": {
      "command": "node",
      "args": ["cesta/k/facebook-ads-mcp-server/dist/index.js"],
      "env": {
        "FACEBOOK_APP_ID": "<YOUR_APP_ID>",
        "FACEBOOK_APP_SECRET": "<YOUR_APP_SECRET>",
        "FACEBOOK_ACCESS_TOKEN": "<YOUR_ACCESS_TOKEN>",
        "FACEBOOK_ACCOUNT_ID": "<YOUR_AD_ACCOUNT_ID>"
      }
    }
  }
}
```

## Dostupné nástroje

### Nástroje pro správu kampaní
- `create_campaign` - Vytvoření nové reklamní kampaně
- `get_campaigns` - Získání seznamu kampaní
- `get_campaign_details` - Získání detailů o kampani
- `update_campaign` - Aktualizace kampaně
- `delete_campaign` - Odstranění kampaně

### Nástroje pro analýzu a vyhodnocování
- `get_campaign_insights` - Získání analytických dat o kampani
- `get_account_insights` - Získání souhrnných dat o účtu
- `compare_campaigns` - Porovnání více kampaní
- `get_campaign_demographics` - Získání demografických údajů

### Nástroje pro správu publik
- `create_custom_audience` - Vytvoření vlastního publika
- `get_audiences` - Získání seznamu publik
- `create_lookalike_audience` - Vytvoření lookalike publika

### Nástroje pro správu příspěvků
- `create_post` - Vytvoření organického příspěvku na Facebook stránce (text, odkaz, obrázek)

## Bezpečnost

Tento MCP server vyžaduje přístup k vašemu Facebook Business Manager účtu prostřednictvím přístupového tokenu. Zajistěte, aby tento token byl bezpečně uložen a nebyl sdílen s neoprávněnými osobami.

Pro produkční nasazení doporučujeme:
- Používat token s minimálními potřebnými oprávněními
- Používat proměnné prostředí pro citlivé údaje
- Pravidelně obnovovat přístupové tokeny
- Implementovat další vrstvy zabezpečení (firewall, VPN)
- **Nikdy neukládat soubor `.env` do verzovacího systému**
- Používat `.env.example` s placeholdery místo skutečných hodnot

## Licence

Distribuováno pod licencí MIT.
