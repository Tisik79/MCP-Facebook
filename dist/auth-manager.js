"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTokens = loadTokens;
exports.saveTokens = saveTokens;
exports.getAppCredentials = getAppCredentials;
exports.saveAppCredentials = saveAppCredentials;
exports.getToken = getToken;
exports.getActivePageId = getActivePageId;
exports.getActivePage = getActivePage;
exports.getAdAccountId = getAdAccountId;
exports.listConnectedPages = listConnectedPages;
exports.listConnectedAdAccounts = listConnectedAdAccounts;
exports.setActiveSelection = setActiveSelection;
exports.reinitSdk = reinitSdk;
exports.refreshUserTokenIfNeeded = refreshUserTokenIfNeeded;
exports.setUserToken = setUserToken;
exports.getOAuthDialogUrl = getOAuthDialogUrl;
exports.getAuthLoginUrl = getAuthLoginUrl;
exports.startAuthServer = startAuthServer;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const facebook_nodejs_business_sdk_1 = require("facebook-nodejs-business-sdk");
const default_app_js_1 = require("./default-app.js");
const SERVER_DIR = path_1.default.resolve(path_1.default.dirname(process.argv[1] || ''), '..');
const TOKENS_FILE = path_1.default.resolve(SERVER_DIR, 'tokens.json');
const CONFIG_FILE_PATH = path_1.default.resolve(SERVER_DIR, 'fb-config.json');
const AUTH_PORT = 3456;
const GRAPH = 'https://graph.facebook.com/v25.0';
const REDIRECT_URI = 'http://localhost:' + AUTH_PORT + '/auth/callback';
const SCOPES = 'ads_management,ads_read,pages_manage_ads,pages_manage_posts,pages_read_engagement,pages_show_list,business_management';
const LONG_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 dní
function loadTokens() {
    if (!fs_1.default.existsSync(TOKENS_FILE))
        return {};
    try {
        return JSON.parse(fs_1.default.readFileSync(TOKENS_FILE, 'utf8'));
    }
    catch {
        return {};
    }
}
function saveTokens(tokens) {
    fs_1.default.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}
function getAppCredentials() {
    if (fs_1.default.existsSync(CONFIG_FILE_PATH)) {
        try {
            const cfg = JSON.parse(fs_1.default.readFileSync(CONFIG_FILE_PATH, 'utf8'));
            if (cfg && cfg.appId && cfg.appSecret) {
                return { appId: String(cfg.appId), appSecret: String(cfg.appSecret), source: 'config' };
            }
        }
        catch { /* poškozený soubor – zkusíme další zdroj */ }
    }
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
        return { appId: process.env.FACEBOOK_APP_ID, appSecret: process.env.FACEBOOK_APP_SECRET, source: 'env' };
    }
    return { ...default_app_js_1.DEFAULT_FB_APP, source: 'builtin' };
}
/** Uloží vlastní App ID/Secret do fb-config.json (přepíše vestavěnou aplikaci). */
function saveAppCredentials(appId, appSecret) {
    fs_1.default.writeFileSync(CONFIG_FILE_PATH, JSON.stringify({ appId, appSecret }, null, 2));
}
function pageEntries(tokens) {
    return Object.entries(tokens).filter(([k]) => !k.startsWith('_'));
}
function normAct(id) {
    if (!id)
        return undefined;
    return id.startsWith('act_') ? id : 'act_' + id;
}
function getToken(pageId) {
    const tokens = loadTokens();
    if (pageId && tokens[pageId]?.access_token)
        return tokens[pageId].access_token;
    if (tokens._user?.access_token)
        return tokens._user.access_token;
    const pages = pageEntries(tokens);
    if (pages.length > 0)
        return pages[0][1].access_token;
    throw new Error('Žádný Facebook token není k dispozici. V Claude řekni: „Připoj Facebook účet".');
}
function getActivePageId() {
    const tokens = loadTokens();
    if (tokens._active?.pageId && tokens[tokens._active.pageId])
        return tokens._active.pageId;
    const pages = pageEntries(tokens);
    return pages.length > 0 ? pages[0][0] : undefined;
}
function getActivePage() {
    const tokens = loadTokens();
    const id = getActivePageId();
    if (!id || !tokens[id])
        return null;
    const p = tokens[id];
    return { id, name: p.name, access_token: p.access_token };
}
function getAdAccountId() {
    const tokens = loadTokens();
    const active = normAct(tokens._active?.adAccountId);
    if (active && tokens._ad_accounts && tokens._ad_accounts[active])
        return active;
    const ids = Object.keys(tokens._ad_accounts || {});
    if (ids.length > 0)
        return normAct(ids[0]);
    return process.env.FACEBOOK_ACCOUNT_ID ? normAct(process.env.FACEBOOK_ACCOUNT_ID) : '';
}
function listConnectedPages() {
    const tokens = loadTokens();
    const activeId = getActivePageId();
    return pageEntries(tokens).map(([id, data]) => ({ id, name: data.name, category: data.category, active: id === activeId }));
}
function listConnectedAdAccounts() {
    const tokens = loadTokens();
    const activeId = getAdAccountId();
    return Object.entries(tokens._ad_accounts || {}).map(([id, data]) => ({
        id, name: data.name, currency: data.currency, active: normAct(id) === activeId,
    }));
}
/** Nastaví aktivní (výchozí) stránku a/nebo reklamní účet. Vrací aktuální stav. */
function setActiveSelection(sel) {
    const tokens = loadTokens();
    const cur = tokens._active || {};
    const next = { ...cur };
    if (sel.pageId !== undefined) {
        if (sel.pageId && !tokens[sel.pageId])
            throw new Error('Stránka ' + sel.pageId + ' není propojena.');
        next.pageId = sel.pageId || undefined;
    }
    if (sel.adAccountId !== undefined) {
        const a = normAct(sel.adAccountId);
        if (a && !(tokens._ad_accounts && tokens._ad_accounts[a]))
            throw new Error('Reklamní účet ' + a + ' není propojen.');
        next.adAccountId = a;
    }
    tokens._active = next;
    saveTokens(tokens);
    reinitSdk();
    return next;
}
/** (Re)inicializuje globální Facebook SDK aktuálním tokenem ze storu. */
function reinitSdk() {
    try {
        const tokens = loadTokens();
        const t = tokens._user?.access_token || pageEntries(tokens)[0]?.[1]?.access_token || process.env.FACEBOOK_ACCESS_TOKEN;
        if (!t)
            return false;
        facebook_nodejs_business_sdk_1.FacebookAdsApi.init(t);
        return true;
    }
    catch {
        return false;
    }
}
// --- Stáhne stránky + reklamní účty z Graph API a uloží do tokens.json ---
async function fetchAndStore(longToken, expires) {
    const [pagesRes, adRes] = await Promise.all([
        fetch(GRAPH + '/me/accounts?fields=id,name,category,tasks,access_token&limit=200&access_token=' + longToken),
        fetch(GRAPH + '/me/adaccounts?fields=id,name,currency&limit=200&access_token=' + longToken),
    ]);
    const pagesData = await pagesRes.json();
    const adData = await adRes.json();
    if (pagesData.error)
        throw new Error('me/accounts: ' + pagesData.error.message);
    if (adData.error)
        throw new Error('me/adaccounts: ' + adData.error.message);
    const prev = loadTokens();
    const tokens = {};
    tokens._user = { access_token: longToken, expires: expires ?? (Date.now() + LONG_TOKEN_TTL_MS) };
    const pageNames = [];
    for (const page of pagesData.data || []) {
        tokens[page.id] = { name: page.name, access_token: page.access_token, category: page.category, tasks: page.tasks };
        pageNames.push(page.name + ' (' + page.id + ')');
    }
    tokens._ad_accounts = {};
    const adNames = [];
    for (const acc of adData.data || []) {
        tokens._ad_accounts[acc.id] = { name: acc.name, currency: acc.currency };
        adNames.push(acc.name + ' (' + acc.id + ', ' + acc.currency + ')');
    }
    // Zachovej dříve zvolené aktivní položky, jinak vyber první dostupnou.
    const prevActive = prev._active || {};
    const firstPageId = (pagesData.data || [])[0]?.id;
    const firstAdId = (adData.data || [])[0]?.id;
    const keepPage = prevActive.pageId && tokens[prevActive.pageId] ? prevActive.pageId : firstPageId;
    const prevAdNorm = normAct(prevActive.adAccountId);
    const keepAd = (prevAdNorm && tokens._ad_accounts[prevAdNorm]) ? prevAdNorm : (firstAdId ? normAct(firstAdId) : undefined);
    tokens._active = { pageId: keepPage, adAccountId: keepAd };
    saveTokens(tokens);
    reinitSdk();
    return { pages: pageNames, adAccounts: adNames };
}
// --- Auto-refresh dlouhého tokenu při startu (pokud zbývá málo do expirace) ---
async function refreshUserTokenIfNeeded(appId, appSecret, refreshWithinMs = 14 * 24 * 60 * 60 * 1000) {
    const tokens = loadTokens();
    const cur = tokens._user;
    if (!cur?.access_token)
        return false;
    const msLeft = (cur.expires || 0) - Date.now();
    if (msLeft > refreshWithinMs) {
        reinitSdk();
        return false;
    } // ještě dost času
    try {
        const res = await fetch(GRAPH + '/oauth/access_token?grant_type=fb_exchange_token&client_id=' + appId +
            '&client_secret=' + appSecret + '&fb_exchange_token=' + cur.access_token);
        const data = await res.json();
        if (data.error || !data.access_token) {
            process.stderr.write('[Facebook MCP] Token nelze obnovit (' + (data.error?.message || 'neznámá chyba') + '). Bude potřeba se znovu přihlásit.\n');
            reinitSdk();
            return false;
        }
        const expires = data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + LONG_TOKEN_TTL_MS;
        await fetchAndStore(data.access_token, expires);
        process.stderr.write('[Facebook MCP] Facebook token automaticky obnoven (platnost prodloužena).\n');
        return true;
    }
    catch (e) {
        process.stderr.write('[Facebook MCP] Chyba při obnově tokenu: ' + e.message + '\n');
        reinitSdk();
        return false;
    }
}
// --- Uloží ručně získaný user access token (např. z Graph API Exploreru) ---
//     Pokud token patří k naší aplikaci, vymění ho za dlouhodobý (60 dní).
//     Pak si stáhne a uloží stránky + reklamní účty.
async function setUserToken(appId, appSecret, providedToken) {
    let token = (providedToken || '').trim();
    // Občas lidé zkopírují i "access_token=" nebo uvozovky – očistíme.
    token = token.replace(/^access_token=/i, '').replace(/^['"]|['"]$/g, '').trim();
    if (!token)
        throw new Error('Prázdný token.');
    let expires;
    let longLived = false;
    try {
        const res = await fetch(GRAPH + '/oauth/access_token?grant_type=fb_exchange_token&client_id=' + appId +
            '&client_secret=' + appSecret + '&fb_exchange_token=' + encodeURIComponent(token));
        const data = await res.json();
        if (data.access_token && !data.error) {
            token = data.access_token;
            expires = data.expires_in ? Date.now() + data.expires_in * 1000 : Date.now() + LONG_TOKEN_TTL_MS;
            longLived = true;
        }
    }
    catch { /* ponecháme původní token */ }
    // expires necháme krátké jen pokud se nepovedlo prodloužit (token z jiné aplikace)
    const { pages, adAccounts } = await fetchAndStore(token, expires ?? (Date.now() + 60 * 60 * 1000));
    return { pages, adAccounts, longLived };
}
function getOAuthDialogUrl(appId) {
    return 'https://www.facebook.com/v25.0/dialog/oauth?client_id=' + appId +
        '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&scope=' + SCOPES + '&response_type=code';
}
function getAuthLoginUrl() {
    return 'http://localhost:' + AUTH_PORT + '/auth/login';
}
function startAuthServer(appId, appSecret) {
    const server = (0, http_1.createServer)(async (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost:' + AUTH_PORT);
        if (url.pathname === '/' || url.pathname === '/auth/login') {
            res.writeHead(302, { Location: getOAuthDialogUrl(appId) });
            res.end();
            return;
        }
        if (url.pathname === '/auth/callback') {
            const code = url.searchParams.get('code');
            const errDesc = url.searchParams.get('error_description');
            if (!code) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<html><body style="font-family:sans-serif;max-width:600px;margin:40px auto"><h1>Přihlášení se nezdařilo</h1><p>' + (errDesc || 'Chybí parametr code.') + '</p></body></html>');
                return;
            }
            try {
                const tokenRes = await fetch(GRAPH + '/oauth/access_token?client_id=' + appId + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&client_secret=' + appSecret + '&code=' + code);
                const tokenData = await tokenRes.json();
                if (tokenData.error)
                    throw new Error(tokenData.error.message);
                const longRes = await fetch(GRAPH + '/oauth/access_token?grant_type=fb_exchange_token&client_id=' + appId + '&client_secret=' + appSecret + '&fb_exchange_token=' + tokenData.access_token);
                const longData = await longRes.json();
                if (longData.error)
                    throw new Error(longData.error.message);
                const expires = longData.expires_in ? Date.now() + longData.expires_in * 1000 : Date.now() + LONG_TOKEN_TTL_MS;
                const { pages, adAccounts } = await fetchAndStore(longData.access_token, expires);
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<html><body style="font-family:sans-serif;max-width:600px;margin:40px auto">' +
                    '<h1>✅ Přihlášení úspěšné!</h1>' +
                    '<h3>Propojené stránky (' + pages.length + '):</h3><ul>' + pages.map(n => '<li>' + n + '</li>').join('') + '</ul>' +
                    '<h3>Reklamní účty (' + adAccounts.length + '):</h3><ul>' + adAccounts.map(n => '<li>' + n + '</li>').join('') + '</ul>' +
                    '<p><strong>Hotovo – zavři toto okno a používej Claude (restart není potřeba).</strong></p></body></html>');
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<html><body style="font-family:sans-serif;max-width:600px;margin:40px auto"><h1>Chyba</h1><pre>' + err.message + '</pre></body></html>');
            }
            return;
        }
        if (url.pathname === '/status') {
            const tokens = loadTokens();
            const pages = listConnectedPages();
            const accs = listConnectedAdAccounts();
            const hasUser = !!tokens._user;
            const expires = tokens._user?.expires ? new Date(tokens._user.expires).toLocaleString('cs-CZ') : 'N/A';
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<html><body style="font-family:sans-serif;max-width:600px;margin:40px auto">' +
                '<h1>Facebook Ads MCP – Status</h1>' +
                '<p>Uživatelský token: ' + (hasUser ? 'aktivní (vyprší ' + expires + ')' : 'nepřihlášen') + '</p>' +
                '<h3>Propojené stránky:</h3>' +
                (pages.length === 0 ? '<p><a href="/auth/login">Přihlásit se</a></p>' :
                    '<ul>' + pages.map(p => '<li>' + p.name + ' (' + p.id + ')' + (p.active ? ' <b>[aktivní]</b>' : '') + '</li>').join('') + '</ul>') +
                '<h3>Reklamní účty:</h3><ul>' + accs.map(a => '<li>' + a.name + ' (' + a.id + ', ' + a.currency + ')' + (a.active ? ' <b>[aktivní]</b>' : '') + '</li>').join('') + '</ul>' +
                '<p><a href="/auth/login">Přihlásit se / přidat další účet</a></p></body></html>');
            return;
        }
        if (url.pathname === '/pages') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ pages: listConnectedPages(), adAccounts: listConnectedAdAccounts() }, null, 2));
            return;
        }
        res.writeHead(404);
        res.end('Not found');
    });
    server.listen(AUTH_PORT, () => {
        process.stderr.write('[Facebook MCP] Auth server běží: http://localhost:' + AUTH_PORT + '/auth/login\n');
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE')
            process.stderr.write('[Facebook MCP] Port ' + AUTH_PORT + ' je obsazen – auth server už pravděpodobně běží.\n');
        else
            process.stderr.write('[Facebook MCP] Auth server chyba: ' + err.message + '\n');
    });
}
//# sourceMappingURL=auth-manager.js.map