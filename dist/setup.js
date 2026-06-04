"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.hasTokens = hasTokens;
exports.runSetupWizard = runSetupWizard;
exports.runOAuthFlow = runOAuthFlow;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const http_1 = require("http");
const child_process_1 = require("child_process");
const SERVER_DIR = path_1.default.resolve(path_1.default.dirname(process.argv[1] || ''), '..');
const CONFIG_FILE = path_1.default.resolve(SERVER_DIR, 'fb-config.json');
const TOKENS_FILE = path_1.default.resolve(SERVER_DIR, 'tokens.json');
const AUTH_PORT = 3456;
function loadConfig() {
    if (fs_1.default.existsSync(CONFIG_FILE)) {
        try {
            return JSON.parse(fs_1.default.readFileSync(CONFIG_FILE, 'utf8'));
        }
        catch {
            return null;
        }
    }
    return null;
}
function saveConfig(cfg) {
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}
function hasTokens() {
    if (!fs_1.default.existsSync(TOKENS_FILE))
        return false;
    try {
        const t = JSON.parse(fs_1.default.readFileSync(TOKENS_FILE, 'utf8'));
        return Object.keys(t).filter(k => !k.startsWith('_')).length > 0 || !!t._user;
    }
    catch {
        return false;
    }
}
function ask(rl, question) {
    return new Promise(resolve => rl.question(question, resolve));
}
function openBrowser(url) {
    const cmd = process.platform === 'darwin' ? 'open' :
        process.platform === 'win32' ? 'start' : 'xdg-open';
    (0, child_process_1.exec)(`${cmd} "${url}"`);
}
async function runSetupWizard() {
    const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stderr });
    process.stderr.write('\n');
    process.stderr.write('╔══════════════════════════════════════════════════════╗\n');
    process.stderr.write('║       Facebook Ads MCP Server – první spuštění      ║\n');
    process.stderr.write('╚══════════════════════════════════════════════════════╝\n');
    process.stderr.write('\n');
    process.stderr.write('Potřebuješ vlastní Facebook App (zdarma, 5 minut).\n');
    process.stderr.write('Otevřu návod v prohlížeči...\n\n');
    openBrowser('https://developers.facebook.com/apps/create/');
    process.stderr.write('Postup:\n');
    process.stderr.write('  1. Klikni "Vytvořit aplikaci"\n');
    process.stderr.write('  2. Zvol typ: "Business"\n');
    process.stderr.write('  3. Zadej libovolný název (např. "Moje reklamy")\n');
    process.stderr.write('  4. Po vytvoření jdi do Nastavení → Základní\n');
    process.stderr.write('  5. Zkopíruj App ID a App Secret\n');
    process.stderr.write('  6. Přidej produkt "Facebook Login" a nastav:\n');
    process.stderr.write('     Valid OAuth Redirect URIs: http://localhost:3456/auth/callback\n');
    process.stderr.write('  7. V Základním nastavení přidej do App Domains: localhost\n');
    process.stderr.write('\n');
    await ask(rl, 'Až budeš mít App ID a Secret, stiskni Enter...');
    process.stderr.write('\n');
    const appId = (await ask(rl, 'Zadej App ID: ')).trim();
    const appSecret = (await ask(rl, 'Zadej App Secret: ')).trim();
    if (!appId || !appSecret) {
        rl.close();
        throw new Error('App ID a App Secret jsou povinné.');
    }
    const cfg = { appId, appSecret };
    saveConfig(cfg);
    rl.close();
    process.stderr.write('\n✅ Konfigurace uložena.\n');
    return cfg;
}
function runOAuthFlow(appId, appSecret) {
    return new Promise((resolve, reject) => {
        const REDIRECT_URI = `http://localhost:${AUTH_PORT}/auth/callback`;
        const SCOPES = 'ads_management,ads_read,pages_manage_ads,pages_read_engagement,pages_show_list,business_management';
        const loginUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES}&response_type=code`;
        process.stderr.write('\n🔗 Otevírám Facebook přihlášení v prohlížeči...\n');
        process.stderr.write('   Pokud se neotevře, jdi ručně na:\n');
        process.stderr.write(`   ${loginUrl}\n\n`);
        openBrowser(loginUrl);
        const server = (0, http_1.createServer)(async (req, res) => {
            const url = new URL(req.url || '/', `http://localhost:${AUTH_PORT}`);
            if (url.pathname !== '/auth/callback') {
                res.writeHead(404);
                res.end();
                return;
            }
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error_description');
            if (!code) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<html><body style="font-family:sans-serif;max-width:500px;margin:60px auto"><h1>❌ Chyba přihlášení</h1><p>${error || 'Neznámá chyba'}</p></body></html>`);
                server.close();
                reject(new Error(error || 'OAuth selhal'));
                return;
            }
            try {
                // Krátkodobý token
                const tokenRes = await fetch(`https://graph.facebook.com/v25.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${appSecret}&code=${code}`);
                const tokenData = await tokenRes.json();
                if (tokenData.error)
                    throw new Error(tokenData.error.message);
                // Long-lived token (60 dní)
                const longRes = await fetch(`https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`);
                const longData = await longRes.json();
                if (longData.error)
                    throw new Error(longData.error.message);
                const longToken = longData.access_token;
                // Načíst stránky a reklamní účty
                const [pagesRes, adRes] = await Promise.all([
                    fetch(`https://graph.facebook.com/v25.0/me/accounts?access_token=${longToken}&fields=id,name,category,access_token&limit=100`),
                    fetch(`https://graph.facebook.com/v25.0/me/adaccounts?access_token=${longToken}&fields=id,name,currency&limit=100`)
                ]);
                const pagesData = await pagesRes.json();
                const adData = await adRes.json();
                // Uložit tokeny
                const tokens = {};
                tokens._user = { access_token: longToken, expires: Date.now() + 60 * 24 * 60 * 60 * 1000 };
                tokens._ad_accounts = {};
                const pageNames = [];
                for (const page of pagesData.data || []) {
                    tokens[page.id] = { name: page.name, access_token: page.access_token, category: page.category };
                    pageNames.push(`${page.name} (${page.id})`);
                }
                for (const acc of adData.data || []) {
                    tokens._ad_accounts[acc.id] = { name: acc.name, currency: acc.currency };
                }
                fs_1.default.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
                // Úspěšná stránka v prohlížeči
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;padding:20px">
          <h1 style="color:#1a7a4a">✅ Přihlášení úspěšné!</h1>
          <h3>Propojené stránky (${pageNames.length}):</h3>
          <ul>${pageNames.map(n => `<li>${n}</li>`).join('')}</ul>
          <p>Reklamní účty: ${Object.keys(tokens._ad_accounts).length}</p>
          <hr>
          <p><strong>Můžeš zavřít toto okno a použít Claude.</strong></p>
          <p style="color:#888;font-size:13px">Pro přidání dalších stránek spusť znovu: <code>facebook-ads-mcp login</code></p>
        </body></html>`);
                process.stderr.write(`\n✅ Přihlášení úspěšné!\n`);
                process.stderr.write(`   Propojeno stránek: ${pageNames.length}\n`);
                pageNames.forEach(n => process.stderr.write(`   • ${n}\n`));
                process.stderr.write('\n');
                server.close();
                resolve();
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<html><body style="font-family:sans-serif;max-width:500px;margin:60px auto"><h1>❌ Chyba</h1><pre>${err.message}</pre></body></html>`);
                server.close();
                reject(err);
            }
        });
        server.listen(AUTH_PORT, () => {
            process.stderr.write(`⏳ Čekám na přihlášení (port ${AUTH_PORT})...\n`);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                reject(new Error(`Port ${AUTH_PORT} je obsazen. Ukonči ostatní procesy a zkus znovu.`));
            }
            else
                reject(err);
        });
        // Timeout po 5 minutách
        setTimeout(() => {
            server.close();
            reject(new Error('Přihlášení vypršelo (5 minut). Zkus znovu.'));
        }, 5 * 60 * 1000);
    });
}
//# sourceMappingURL=setup.js.map