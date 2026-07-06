# Facebook Ads MCP Server

🇨🇿 [Česká verze](README.cs.md)

MCP server for managing Facebook ads straight from Claude AI. No manual token hunting — sign in with Facebook once and you're done.

## Features

- Campaign management (create, update, delete)
- Ad sets and individual ads
- Analytics and insights
- Custom and lookalike audiences
- Page posts
- Automatic token management (page tokens are permanent)

## Installation

### Requirements
- Node.js 18+
- Claude Desktop

### 1. Clone the repository

```bash
git clone https://github.com/Tisik79/MCP-Facebook.git
cd MCP-Facebook
npm install
npm run build
```

### 2. Add to Claude Desktop

Open the Claude Desktop config file:
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add:

```json
{
  "mcpServers": {
    "facebook-ads": {
      "command": "node",
      "args": ["/PATH/TO/MCP-Facebook/dist/index.js"]
    }
  }
}
```

### 3. First run — 5-minute setup

On first start, a wizard walks you through creating your own Facebook App:

```
Steps:
  1. Click "Create App"
  2. Choose type: "Business"
  3. Enter any name (e.g. "My Ads")
  4. After creation, go to Settings → Basic
  5. Copy the App ID and App Secret
  6. Add the "Facebook Login" product and set:
     Valid OAuth Redirect URIs: http://localhost:3456/auth/callback
  7. In Basic settings, add "localhost" to App Domains
```

After entering the App ID and Secret, a browser opens automatically → sign in with Facebook → done.

### Re-login / adding pages

```bash
node dist/index.js login
```

## Usage in Claude

```
"Show my active campaigns"
"Create a campaign for MyBrand with a $20 daily budget"
"How did my ads perform last month?"
"Post an update to page XY"
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_connected_accounts` | Show connected pages and ad accounts |
| `get_campaigns` | List campaigns |
| `create_campaign` | Create a new campaign |
| `update_campaign` | Update a campaign |
| `get_campaign_insights` | Campaign analytics |
| `get_adsets` | List ad sets |
| `create_ad_set` | Create an ad set (incl. lead fields `promotedObject` / `destinationType`) |
| `update_adset` | Update an ad set (name / status) — real write + read-after-write verification |
| `get_ads` | List ads (filtered via adSetId/campaignId edge + status) |
| `get_ad` | Ad detail incl. creative (link, CTA, copy, video/image) |
| `create_lead_form` | Create an instant lead form on a page |
| `get_lead_forms` | List lead forms (`id`, `name`, `status`, `leads_count`) |
| `get_pixels` | Account pixels (`id`, `name`) for `promoted_object` |
| `create_pixel` / `update_pixel` / `get_pixel` | Pixel management (detail incl. `last_fired_time`) |
| `get_pixel_stats` | Pixel event statistics (verify events are flowing) |
| `search_interests` / `get_interest_suggestions` | Interest search & suggestions for targeting |
| `search_behaviors` | Behavior categories for targeting |
| `search_geo_locations` | Geo keys (region/city/zip) for `targeting.geo_locations` |
| `estimate_audience_size` | Audience size estimate for a given targeting spec |
| `send_conversion_event` / `..._batch` | Conversions API — server-side events (auto SHA-256 PII hashing) |
| `get/create/update/delete_custom_conversion(s)` | Custom conversions (`custom_conversion_id` for lead campaigns) |
| `get/create_offline_conversion_set(s)`, `upload_offline_conversions` | Offline conversions from your CRM |
| `update_adcreative` | Update a creative (name/status — content is immutable) |
| `get_audiences` | Custom audiences |
| `create_custom_audience` | Create an audience |
| `create_lookalike_audience` | Lookalike audience |
| `create_post` | Page post |

The scope of the targeting/conversion tool set was inspired by
[Draivix/aidvertaiser](https://github.com/Draivix/aidvertaiser) (David Strejc, MIT) — thanks!

## Lead Campaigns (OUTCOME_LEADS)

Lead collection has two paths; both require `promotedObject` + `destinationType` on the ad set:

- **Website conversions** — `optimizationGoal=OFFSITE_CONVERSIONS`, `destinationType=WEBSITE`,
  `promotedObject={ pixel_id, custom_event_type: "LEAD" }` (find your Pixel ID via `get_pixels`).
- **Instant form** — `optimizationGoal=LEAD_GENERATION`, `destinationType=ON_AD`,
  `promotedObject={ page_id }`, creative with `call_to_action.value.lead_gen_form_id`
  (create the form via `create_lead_form`).

Without `promotedObject` + `destinationType`, Meta returns "Invalid parameter". For accounts
with campaign-level budget (CBO), **do not set a budget on the ad set** — it inherits from the
campaign. If the campaign uses a cap bid strategy (`LOWEST_COST_WITH_BID_CAP`), the ad set
requires `bidAmount`; otherwise set the campaign to `bidStrategy=LOWEST_COST_WITHOUT_CAP`.

## License

MIT
