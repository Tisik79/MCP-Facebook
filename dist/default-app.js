"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FB_APP = void 0;
// Vestavěná sdílená Facebook aplikace.
//
// Slouží jako fallback, aby MCP fungoval ihned po instalaci bez ručního nastavování.
// App ID/Secret se hledá v tomto pořadí (první nalezené vyhrává):
//   1) soubor fb-config.json  ->  {"appId":"...","appSecret":"..."}
//   2) proměnné prostředí       ->  FACEBOOK_APP_ID / FACEBOOK_APP_SECRET
//   3) tato vestavěná aplikace  ->  DEFAULT_FB_APP
//
// Pozn.: App Secret je zde záměrně součástí repozitáře (sdílená aplikace).
// Pokud chceš vlastní oddělené limity / vlastní branding, vytvoř si vlastní app
// na https://developers.facebook.com a vlož údaje do fb-config.json.
// Vyžaduje, aby v aplikaci byl mezi "Valid OAuth Redirect URIs" zapsán:
//   http://localhost:3456/auth/callback
exports.DEFAULT_FB_APP = {
    appId: '1427438961557798',
    appSecret: '8fad9af29a24b64d0ac811b6dfb739c2',
};
//# sourceMappingURL=default-app.js.map