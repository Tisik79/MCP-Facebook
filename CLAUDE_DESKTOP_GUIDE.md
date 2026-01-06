# Guide: Using the Facebook Ads MCP Server with Claude Desktop

This guide explains how to connect and use the `facebook-ads-mcp-server` with the Claude Desktop application.

## Prerequisites

1.  **Node.js and npm**: Ensure you have Node.js (which includes npm) installed on your system. You can download it from [nodejs.org](https://nodejs.org/).
2.  **Project Setup**: Clone or download the `MCP-Facebook` project directory.
3.  **Dependencies**: Navigate to the project directory (`/Users/jantesnar/MCP-Facebook`) in your terminal and run `npm install` to install the necessary dependencies.
4.  **Configuration**: Copy the `.env.example` file to `.env` in the root of the project directory and add your Facebook App credentials:
    ```bash
    cp .env.example .env
    ```
    Then edit the `.env` file with your actual values:
    ```dotenv
    FACEBOOK_APP_ID=YOUR_APP_ID
    FACEBOOK_APP_SECRET=YOUR_APP_SECRET
    FACEBOOK_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
    FACEBOOK_ACCOUNT_ID=act_YOUR_ACCOUNT_ID
    PORT=3000
    ```
    Replace the placeholder values with your actual credentials. **Crucially, ensure your Access Token has the necessary permissions**:
    - `ads_management` permission to allow creating/modifying campaigns, ad sets, and audiences
    - `ads_read` permission for read-only operations
    - `pages_manage_posts` permission to create organic posts on Facebook Pages

    > **Security Note**: Never commit your `.env` file to version control. The `.env` file is already included in `.gitignore`.
5.  **Build the Server**: Run `npm run build` in the project directory to compile the TypeScript code into JavaScript (output will be in the `dist` folder).

## Configuring Claude Desktop

To allow Claude Desktop to communicate with this server, you need to add it to the `claude_desktop_config.json` file.

1.  **Locate the Config File**: Find `claude_desktop_config.json`. The location varies by OS (e.g., `~/.config/claude-desktop/` on Linux, `~/Library/Application Support/claude-desktop/` on macOS).
2.  **Edit the File**: Open the file in a text editor. Add the following server configuration object to the `servers` array. If the `servers` array doesn't exist, create it.

    ```json
    {
      "servers": [
        // ... (other existing servers, if any)
        {
          "name": "facebook-ads-mcp-local", // You can choose any name
          "description": "Local MCP server for Facebook Ads Management",
          // Command to run the server using node and the compiled JS file
          // Make sure the path is correct for your system
          "command": ["node", "/Users/jantesnar/MCP-Facebook/dist/index.js"],
          // Optional: Specify the working directory if needed (usually the project root)
          "cwd": "/Users/jantesnar/MCP-Facebook",
          "enabled": true
        }
      ]
    }
    ```
    *   **Important**: Ensure the path in the `command` array (`/Users/jantesnar/MCP-Facebook/dist/index.js`) is the correct absolute path to the compiled server script on your system.
    *   If adding to an existing `servers` array, remember to add a comma after the preceding server object.

3.  **Restart Claude Desktop**: Save the changes to `claude_desktop_config.json` and restart the Claude Desktop application for the changes to take effect.

## Using the Server in Claude Desktop

Once configured, the "facebook-ads-mcp-local" server (or the name you chose) should appear in the list of available MCP servers within Claude Desktop. You can now interact with it using its tools.

### Available Tools Overview

*   **Campaign Management**:
    *   `create_campaign`: Creates a new ad campaign. Requires name, objective, status. Optional: budget, start/end times, special ad categories.
    *   `get_campaigns`: Lists existing campaigns. Optional filters: limit, status.
    *   `get_campaign_details`: Gets details for a specific campaign ID.
    *   `update_campaign`: Updates an existing campaign (name, status, budget, end time). Requires campaign ID.
    *   `delete_campaign`: Deletes a campaign by ID.
*   **Audience Management**:
    *   `create_custom_audience`: Creates a custom audience (type CUSTOM, WEBSITE, ENGAGEMENT). Requires name, subtype. `description` and `customer_file_source` are required for CUSTOM. `rule` (complex JSON object) is required for WEBSITE/ENGAGEMENT.
    *   `get_audiences`: Lists available custom audiences. Optional filter: limit.
    *   `create_lookalike_audience`: Creates a lookalike audience (type LOOKALIKE). Requires `sourceAudienceId`, `name`, `country`. Optional: `description`, `ratio`.
*   **Ad Set Management**:
    *   `create_ad_set`: Creates a new ad set under a campaign. Requires `campaignId`, `name`, `status`, `targeting` (complex JSON object), `optimizationGoal`, `billingEvent`, and a budget (`dailyBudget` or `lifetimeBudget` in cents). Optional: `bidAmount` (cents), `startTime`, `endTime`.
*   **Post Management**:
    *   `create_post`: Creates an organic post on a Facebook Page. Requires `content` (text of the post). Optional: `link` (URL to include in the post), `imagePath` (path to an image file to include in the post).
*   **Analytics**:
    *   `get_campaign_insights`: Retrieves performance insights for a campaign. Requires campaign ID, start date (`since`), end date (`until`). Optional: specific metrics.
*   **AI Assistance**:
    *   `generate_campaign_prompt`: Generates a detailed prompt based on a template name and variables, useful for guiding AI in campaign creation tasks.

### Example Usage (Prompts for Claude)

*   **Create a Campaign**: "Use the `facebook-ads-mcp-local` server to create a new campaign named 'Spring Sale Promo' with the objective 'LINK_CLICKS' and status 'PAUSED'. Set a daily budget of $20 (use '2000' for the tool parameter)."
*   **List Active Campaigns**: "Using `facebook-ads-mcp-local`, list my active campaigns." (Uses `get_campaigns` with status filter)
*   **Get Campaign Details**: "Get the details for campaign ID '123456789' using `facebook-ads-mcp-local`."
*   **Create an Ad Set**: "Via `facebook-ads-mcp-local`, create an ad set named 'Website Visitors Retargeting' under campaign '987654321'. Set status to 'ACTIVE', optimization goal to 'OFFSITE_CONVERSIONS', billing event to 'IMPRESSIONS', and a daily budget of $10 (use 1000 for the tool parameter). For targeting, use `{ 'geo_locations': { 'countries': ['US'] } }`." (Note: Targeting object needs to be valid JSON according to Facebook API specs).
*   **Create a Lookalike Audience**: "Using `facebook-ads-mcp-local`, create a lookalike audience named 'Lookalike US 1%' based on source audience '111222333'. Target country 'US' and use the default 1% ratio."
*   **Create an Organic Post**: "Using `facebook-ads-mcp-local`, create a new post on my Facebook Page with the content 'Exciting news! We're launching a new product next week. Stay tuned for more details!' and include the link 'https://example.com/new-product'."
*   **Create a Post with Image**: "Using `facebook-ads-mcp-local`, create a new post on my Facebook Page with the content 'Check out our new office!' and include the image at '/path/to/office-image.jpg'."
*   **Generate a Prompt**: "Use `facebook-ads-mcp-local` and the `generate_campaign_prompt` tool with template 'campaignCreation' and variables `{\"product\": \"My SaaS\", \"target_audience\": \"Small business owners\", \"budget\": \"$500\", \"goal\": \"Lead Generation\"}`." (Note the required variable names for this template).

Remember to replace example IDs, names, and values with your actual data. Refer to the tool descriptions provided by the server in Claude Desktop for exact parameter names and requirements. **Ensure your Access Token in the `.env` file has the necessary permissions for the tools you intend to use**:
- `ads_management` for creating/modifying campaigns, ad sets, and audiences
- `ads_read` for read-only operations
- `pages_manage_posts` for creating organic posts on Facebook Pages
