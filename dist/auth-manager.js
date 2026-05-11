"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTokens = loadTokens;
exports.saveTokens = saveTokens;
exports.getToken = getToken;
exports.getAdAccountId = getAdAccountId;
exports.listConnectedPages = listConnectedPages;
exports.startAuthServer = startAuthServer;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const SERVER_DIR = path_1.default.resolve(path_1.default.dirname(process.argv[1] || ''), '..');
const TOKENS_FILE = path_1.default.resolve(SERVER_DIR, 'tokens.json');
const CONFIG_FILE_PATH = path_1.default.resolve(SERVER_DIR, 'fb-config.json');
const AUTH_PORT = 3456;
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
function getToken(pageId) {
    const tokens = loadTokens();
    if (pageId && tokens[pageId]?.access_token)
        return tokens[pageId].access_token;
    if (tokens._user?.access_token)
        return tokens._user.access_token;
    const pages = Object.entries(tokens).filter(([k]) => !k.startsWith('_'));
    if (pages.length > 0)
        return pages[0][1].access_token;
    throw new Error('Zadny Facebook token neni k dispozici.\n' +
        'Prihlaste se pres: http://localhost:' + AUTH_PORT + '/auth/login');
}
function getAdAccountId() {
    const tokens = loadTokens();
    const accounts = tokens._ad_accounts;
    if (accounts) {
        const ids = Object.keys(accounts);
        if (ids.length > 0)
            return ids[0].startsWith('act_') ? ids[0] : 'act_' + ids[0];
    }
    return process.env.FACEBOOK_ACCOUNT_ID || '';
}
function listConnectedPages() {
    const tokens = loadTokens();
    return Object.entries(tokens)
        .filter(([k]) => !k.startsWith('_'))
        .map(([id, data]) => ({ id, name: data.name, category: data.category }));
}
function startAuthServer(appId, appSecret) {
    const REDIRECT_URI = 'http://localhost:' + AUTH_PORT + '/auth/callback';
    const SCOPES = 'ads_management,ads_read,pages_manage_ads,pages_read_engagement,pages_show_list,business_management';
    const server = (0, http_1.createServer)(async (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost:' + AUTH_PORT);
        if (url.pathname === '/auth/login') {
            const fbUrl = 'https://www.facebook.com/v19.0/dialog/oauth?' +
                'client_id=' + appId +
                '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
                '&scope=' + SCOPES + '&response_type=code';
            res.writeHead(302, { Location: fbUrl });
            res.end();
            return;
        }
        if (url.pathname === '/auth/callback') {
            const code = url.searchParams.get('code');
            if (!code) {
                res.writeHead(400);
                res.end('Chybi code.');
                return;
            }
            try {
                const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token?' +
                    'client_id=' + appId + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
                    '&client_secret=' + appSecret + '&code=' + code);
                const tokenData = await tokenRes.json();
                if (tokenData.error)
                    throw new Error(tokenData.error.message);
                const longRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token?' +
                    'grant_type=fb_exchange_token&client_id=' + appId +
                    '&client_secret=' + appSecret + '&fb_exchange_token=' + tokenData.access_token);
                const longData = await longRes.json();
                if (longData.error)
                    throw new Error(longData.error.message);
                const longToken = longData.access_token;
                const pagesRes = await fetch('https://graph.facebook.com/v19.0/me/accounts?access_token=' + longToken + '&fields=id,name,category,tasks,access_token');
                const pagesData = await pagesRes.json();
                const adRes = await fetch('https://graph.facebook.com/v19.0/me/adaccounts?access_token=' + longToken + '&fields=id,name,currency');
                const adData = await adRes.json();
                const tokens = loadTokens();
                tokens._user = { access_token: longToken, expires: Date.now() + 60 * 24 * 60 * 60 * 1000 };
                const pageNames = [];
                for (const page of pagesData.data || []) {
                    tokens[page.id] = { name: page.name, access_token: page.access_token, category: page.category, tasks: page.tasks };
                    pageNames.push(page.name + ' (' + page.id + ')');
                }
                tokens._ad_accounts = {};
                const adNames = [];
                for (const acc of adData.data || []) {
                    tokens._ad_accounts[acc.id] = { name: acc.name, currency: acc.currency };
                    adNames.push(acc.name + ' (' + acc.id + ')');
                }
                saveTokens(tokens);
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<html><body style="font-family:sans-serif;max-width:600px;margin:40px auto">' +
                    '<h1>Prihlaseni uspesne!</h1>' +
                    '<h3>Propojene stranky (' + pageNames.length + '):</h3><ul>' + pageNames.map((n) => '<li>' + n + '</li>').join('') + '</ul>' +
                    '<h3>Reklamni ucty (' + adNames.length + '):</h3><ul>' + adNames.map((n) => '<li>' + n + '</li>').join('') + '</ul>' +
                    '<p>Muzete zavrit toto okno.</p></body></html>');
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>Chyba</h1><pre>' + err.message + '</pre>');
            }
            return;
        }
        if (url.pathname === '/status') {
            const tokens = loadTokens();
            const pages = listConnectedPages();
            const hasUser = !!tokens._user;
            const expires = tokens._user?.expires ? new Date(tokens._user.expires).toLocaleDateString('cs-CZ') : 'N/A';
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<html><body style="font-family:sans-serif;max-width:600px;margin:40px auto">' +
                '<h1>Facebook Ads MCP - Status</h1>' +
                '<p>User token: ' + (hasUser ? 'aktivni (vypri ' + expires + ')' : 'neprihlaseni') + '</p>' +
                '<h3>Propojene stranky:</h3>' +
                (pages.length === 0 ? '<p><a href="/auth/login">Prihlasit se</a></p>' :
                    '<ul>' + pages.map((p) => '<li>' + p.name + ' (' + p.id + ')</li>').join('') + '</ul>') +
                '<p><a href="/auth/login">Prihlasit se / pridat dalsi ucet</a></p></body></html>');
            return;
        }
        if (url.pathname === '/pages') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(listConnectedPages(), null, 2));
            return;
        }
        res.writeHead(404);
        res.end('Not found');
    });
    server.listen(AUTH_PORT, () => {
        process.stderr.write('[Facebook MCP] Auth: http://localhost:' + AUTH_PORT + '/auth/login\n');
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            process.stderr.write('[Facebook MCP] Port ' + AUTH_PORT + ' obsazen.\n');
        }
    });
}
//# sourceMappingURL=auth-manager.js.map