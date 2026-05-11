"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAuth = ensureAuth;
const path_1 = __importDefault(require("path"));
const setup_js_1 = require("./setup.js");
const CONFIG_FILE = path_1.default.resolve(process.cwd(), 'fb-config.json');
const TOKENS_FILE = path_1.default.resolve(process.cwd(), 'tokens.json');
async function ensureAuth() {
    // Zkontroluj jestli je to login příkaz z CLI
    const isLoginCmd = process.argv.includes('login');
    let cfg = (0, setup_js_1.loadConfig)();
    // Pokud není konfigurace, spusť wizard
    if (!cfg) {
        cfg = await (0, setup_js_1.runSetupWizard)();
    }
    // Pokud není přihlášen nebo je to explicitní login příkaz
    if (!(0, setup_js_1.hasTokens)() || isLoginCmd) {
        process.stderr.write('\n🔐 Přihlášení k Facebooku...\n');
        await (0, setup_js_1.runOAuthFlow)(cfg.appId, cfg.appSecret);
    }
    return { appId: cfg.appId, appSecret: cfg.appSecret };
}
//# sourceMappingURL=auth-entry.js.map