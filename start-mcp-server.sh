#!/bin/bash

# Nastavení potřebných proměnných prostředí pro Facebook API
# Zde je potřeba vyplnit skutečné hodnoty
export FACEBOOK_ACCESS_TOKEN="YOUR_FB_ACCESS_TOKEN"
export FACEBOOK_ACCOUNT_ID="YOUR_FB_ACCOUNT_ID"
export FACEBOOK_APP_ID="YOUR_FB_APP_ID"
export FACEBOOK_APP_SECRET="YOUR_FB_APP_SECRET"

# Spuštění MCP serveru a přesměrování stderr do souboru
node build/index.js 2> mcp_server_stderr.log

