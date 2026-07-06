# Jak připojit Facebook k MCP (pro úplné laiky)

Máš dvě možnosti. **Začni první** – je rychlejší a nemusíš nic nastavovat.

---

## ✅ Způsob 1 (doporučený) – token z Graph API Exploreru (~1 minuta)

Tohle obejde úplně všechno kolem „domén aplikace" a přesměrování. Stačí:

1. Otevři **https://developers.facebook.com/tools/explorer/** a přihlas se.
2. Vpravo nahoře v poli **„Meta App" / „Aplikace"** vyber svou aplikaci.
   - Ideálně **tu samou, jejíž App ID/Secret má MCP** (jinak token vydrží jen pár hodin).
   - **Nemáš žádnou aplikaci?** Klikni tam **„Create App"** → typ **„Business"** → libovolný název → vytvořit. (Nebo přes https://developers.facebook.com/apps/ → „Vytvořit aplikaci".) App ID a App Secret pak najdeš v **Nastavení → Základní** – pošli mi je a uložím je do `fb-config.json`, token z Exploreru pak půjde prodloužit na 60 dní.
3. Klikni **„Generate Access Token" / „Generovat přístupový token"** → vyber **„Get User Access Token"**.
4. Do vyhledávacího pole oprávnění postupně napiš a **zaškrtni**:
   ```
   ads_management
   ads_read
   pages_show_list
   pages_read_engagement
   pages_manage_posts
   pages_manage_ads
   business_management
   leads_retrieval
   ```
   (`leads_retrieval` je potřeba pro čtení leadů z instant formulářů.)
5. Klikni **„Generate Access Token"**. Facebook otevře okno – **potvrď** a **povol přístup**
   ke stránkám / podnikání, které chceš spravovat.
6. **Zkopíruj** vygenerovaný token (dlouhý řetězec začínající `EAA...`).
7. V Claude napiš:
   ```
   Nastav Facebook token: EAA...(sem vlož celý token)
   ```
   MCP token ověří, prodlouží na ~60 dní (pokud byl z té správné aplikace) a **sám si stáhne
   a uloží** propojené stránky i reklamní účty. Restart není potřeba. Stav: „Zobraz propojené účty".

> Token z Exploreru obvykle platí jen pár hodin. Pokud jsi v kroku 2 vybral aplikaci, jejíž
> App ID/Secret má MCP, MCP ho automaticky vymění za dlouhodobý (60 dní) a dál ho sám obnovuje.
> Když ne, prostě po čase zopakuj kroky 1–7.

---

## Způsob 2 (alternativa) – přihlášení přes okno (OAuth)

Tohle je „hezčí" (přihlašovací okno Facebooku), ale **vyžaduje nastavit aplikaci** a Facebook
dost často mění rozložení obrazovek v Developer dashboardu – proto když některou položku
nevidíš tam, kde je popsaná, nehledej dál a použij **Způsob 1** výše.

Adresy, které budeš vyplňovat: `http://localhost:3456/` a `http://localhost:3456/auth/callback`
(„localhost" = tvůj počítač, nikam to neodchází).

### a) Přidej „Facebook Login"
Bez tohohle produktu/use-case neexistuje stránka s polem „Valid OAuth Redirect URIs".
- **Klasické rozhraní:** levé menu dole **„+ Přidat produkt"** → u **„Facebook Login"** klikni
  **„Nastavit"** → vyber **„Web"** → zbytek průvodce přeskoč.
- **Nové rozhraní (Use cases):** levé menu **„Use cases"** → najdi
  **„Authenticate and request data from users with Facebook Login"** → **„Customize"** / přidat.
  Uvnitř pak bude pod-stránka **„Settings"** (a **„Permissions"**, kde si přidáš oprávnění
  `ads_management`, `pages_show_list`, `business_management`, …).

### b) Nastavení → Základní (App Settings → Basic)
- Pole **„Domény aplikací"** (App Domains) → napiš `localhost` → Enter.
- Sjeď dolů → **„+ Přidat platformu"** → vyber **„Web"** → do **„URL webu"** napiš
  `http://localhost:3456/`.
- **„Uložit změny"**.

### c) Facebook Login → Settings (nebo Use cases → … → Settings)
- **„Client OAuth Login"** = **Ano**
- **„Web OAuth Login"** = **Ano**
- **„Platné identifikátory URI pro přesměrování OAuth"** (Valid OAuth Redirect URIs) →
  napiš **přesně**:
  ```
  http://localhost:3456/auth/callback
  ```
  (bez koncového lomítka, malými písmeny, `http` – ne `https`)
- **„Uložit změny"**.

### d) Režim aplikace
Vpravo nahoře přepínač – stačí **„Vývoj"** (Development), protože se přihlašuješ svým vlastním
účtem (jsi admin aplikace). Pro cizí účet ho přidej v **„Role aplikace"** jako „Testera",
nebo aplikaci přepni na **„Aktivní"** (to vyžaduje pár dalších věcí a u některých oprávnění
App Review – pro použití „jen pro sebe" není potřeba).

### e) Zkus to
V Claude řekni **„Připoj Facebook účet"**. Po přihlášení si MCP sám uloží tokeny i propojené účty.

---

## Když nic nepomáhá

| Co vidíš | Co s tím |
|---|---|
| „URL se nedá načíst / Doména této adresy URL není součástí domén aplikací" | Buď nemáš přidaný „Facebook Login" (krok a), nebo chybí `localhost` v „Domény aplikací" (krok b), nebo Redirect URI (krok c). **Nebo prostě použij Způsob 1.** |
| Na stránce `…/fb-login/settings/` nevidím „Valid OAuth Redirect URIs" | Produkt „Facebook Login" ještě není přidaný, nebo máš nové „Use cases" rozhraní – viz krok a). **Nebo použij Způsob 1.** |
| „URL blokována" / „redirect_uri není povolená" | Redirect URI musí být **přesně** `http://localhost:3456/auth/callback`. |
| „Aplikace není k dispozici" / „App not active" | Přepni na režim „Vývoj", nebo si přidej svůj účet do Role aplikace. |
| Token z Exploreru se „nepodařilo ověřit" | Zkopíruj **celý** token (je hodně dlouhý, začíná `EAA…`) a zkontroluj zaškrtnutá oprávnění. |
| Port 3456 obsazen | Úplně ukonči Claude (Cmd+Q) a spusť znovu – běžel starý proces. |

Stav serveru a propojené účty si můžeš kdykoli zobrazit i v prohlížeči na **http://localhost:3456/status**
(když MCP server běží).
