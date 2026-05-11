import fs from 'fs';
import path from 'path';
import { loadConfig, saveConfig, hasTokens, runSetupWizard, runOAuthFlow } from './setup.js';

const CONFIG_FILE = path.resolve(process.cwd(), 'fb-config.json');
const TOKENS_FILE = path.resolve(process.cwd(), 'tokens.json');

export async function ensureAuth(): Promise<{ appId: string; appSecret: string }> {
  // Zkontroluj jestli je to login příkaz z CLI
  const isLoginCmd = process.argv.includes('login');

  let cfg = loadConfig();

  // Pokud není konfigurace, spusť wizard
  if (!cfg) {
    cfg = await runSetupWizard();
  }

  // Pokud není přihlášen nebo je to explicitní login příkaz
  if (!hasTokens() || isLoginCmd) {
    process.stderr.write('\n🔐 Přihlášení k Facebooku...\n');
    await runOAuthFlow(cfg.appId, cfg.appSecret);
  }

  return { appId: cfg.appId, appSecret: cfg.appSecret };
}
