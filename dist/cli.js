#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const setup_js_1 = require("./setup.js");
const arg = process.argv[2];
async function main() {
    if (arg === 'login' || arg === 'setup') {
        let cfg = (0, setup_js_1.loadConfig)();
        if (!cfg || arg === 'setup') {
            cfg = await (0, setup_js_1.runSetupWizard)();
        }
        await (0, setup_js_1.runOAuthFlow)(cfg.appId, cfg.appSecret);
        process.stderr.write('\n✅ Hotovo! Restartuj Claude Desktop.\n\n');
        process.exit(0);
        return;
    }
    if (arg === 'status') {
        const cfg = (0, setup_js_1.loadConfig)();
        const ok = (0, setup_js_1.hasTokens)();
        process.stderr.write(cfg ? `App ID: ${cfg.appId}\n` : 'Není nakonfigurováno.\n');
        process.stderr.write(ok ? '✅ Přihlášen\n' : '❌ Nepřihlášen — spusť: npx facebook-ads-mcp login\n');
        process.exit(0);
        return;
    }
    // Bez argumentu = spusť MCP server normálně
    process.stderr.write('Pro spusteni MCP serveru pouzij: node dist/index.js\n');
}
main().catch(err => {
    process.stderr.write('Chyba: ' + err.message + '\n');
    process.exit(1);
});
//# sourceMappingURL=cli.js.map