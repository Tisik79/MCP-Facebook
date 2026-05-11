export interface FbConfig {
    appId: string;
    appSecret: string;
}
export declare function loadConfig(): FbConfig | null;
export declare function saveConfig(cfg: FbConfig): void;
export declare function hasTokens(): boolean;
export declare function runSetupWizard(): Promise<FbConfig>;
export declare function runOAuthFlow(appId: string, appSecret: string): Promise<void>;
