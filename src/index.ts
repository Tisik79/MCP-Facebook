#!/usr/bin/env node
console.error(">>> SCRIPT START: index.ts execution begins.");
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
console.error(">>> SCRIPT IMPORT: MCP SDK imports done.");
import * as fs from 'fs'; // Import fs for file operations
import * as path from 'path'; // Import path for extension checking
console.error(">>> SCRIPT IMPORT: Node built-in imports (fs, path) done.");

// --- Global Variables (Configuration & SDK Instances) ---
// Declared here, assigned in main() after successful import/init
let FacebookAdsApi: any, AdAccount: any, Campaign: any, AdSet: any, Ad: any, AdCreative: any, Insights: any, Business: any, Page: any, CustomAudience: any;
let apiInstance: any;

// --- Configuration from Environment Variables ---
// Read environment variables early
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const APP_ID = process.env.FACEBOOK_APP_ID;
const AD_ACCOUNT_ID = process.env.FACEBOOK_ACCOUNT_ID;

// --- MCP Server Implementation ---
class FacebookAdsServer {
    private server: Server;

    constructor() {
        console.error("[Constructor] START: Creating MCP Server instance...");
        this.server = new Server(
            {
                name: 'facebook-ads', // Match the name in claude_desktop_config.json
                version: '0.1.3-startup-logging', // Reverted to this version structure
            },
            {
                capabilities: {
                    resources: {}, // No resources defined for now
                    tools: {},
                },
            }
        );
        console.error("[Constructor] MID: MCP Server instance created. Setting up handlers...");

        // Setup error handlers immediately in the constructor
        this.setupErrorHandlers();
        this.setupToolHandlers();
        console.error("[Constructor] END: FacebookAdsServer instance created and handlers set up.");
    }

    private setupErrorHandlers() {
        console.error("[ErrorHandlers] Setting up error handlers...");
        // Error handling for the MCP server itself
        this.server.onerror = (error: any) => console.error('[MCP Error]', error);

        // Process-level error handling - set these up once
        process.on('uncaughtException', (error, origin) => {
            console.error(`Unhandled Exception at: ${origin}`, error);
            this.server?.close().finally(() => process.exit(1));
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.server?.close().finally(() => process.exit(1));
        });
        process.on('SIGINT', async () => {
            console.error('Received SIGINT, shutting down server...');
            await this.server?.close();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
             console.error('Received SIGTERM, shutting down server...');
             await this.server?.close();
             process.exit(0);
         });
         console.error("[ErrorHandlers] Error handlers set up.");
    }


    private setupToolHandlers() {
        console.error("[ToolHandlers] Setting up tool handlers...");
        // --- List Available Tools ---
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
             console.error("[ListTools] Request received.");
             // Return the actual tools list (ensure schemas are complete or placeholders)
             return ({
                tools: [
                     { name: 'list_campaigns', description: '...', inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['ACTIVE', 'PAUSED', /* ... */], default: 'ACTIVE' } } } },
                     { name: 'create_campaign', description: '...', inputSchema: { type: 'object', properties: { name: { type: 'string' }, objective: { type: 'string', enum: [/* ... */] } }, required: ['name', 'objective'] } },
                     { name: 'update_campaign', description: '...', inputSchema: { type: 'object', properties: { campaign_id: { type: 'string' }, name: { type: 'string' } /* ... */ }, required: ['campaign_id'] } },
                     { name: 'delete_campaign', description: '...', inputSchema: { type: 'object', properties: { campaign_id: { type: 'string' } }, required: ['campaign_id'] } },
                     { name: 'list_adsets', description: '...', inputSchema: { type: 'object', properties: { campaign_id: { type: 'string' }, status: { type: 'string', enum: [/* ... */], default: 'ACTIVE' } } } },
                     {
                         name: 'create_adset',
                         description: 'Create a new ad set within a campaign.',
                         inputSchema: {
                             type: 'object',
                             properties: {
                                 campaign_id: { type: 'string', description: 'Campaign ID.' },
                                 name: { type: 'string', description: 'Ad set name.' },
                                 status: { type: 'string', enum: ['ACTIVE', 'PAUSED'], default: 'PAUSED', description: 'Initial status.' },
                                 billing_event: { type: 'string', description: 'Billing event (e.g., IMPRESSIONS).', enum: ['APP_INSTALLS', 'CLICKS', 'IMPRESSIONS', 'LINK_CLICKS', 'OFFER_CLAIMS', 'PAGE_LIKES', 'POST_ENGAGEMENT', 'THRUPLAY', 'PURCHASE', 'LISTING_INTERACTION'] },
                                 optimization_goal: { type: 'string', description: 'Optimization goal (e.g., REACH).', enum: ['NONE', 'APP_INSTALLS', 'BRAND_AWARENESS', 'AD_RECALL_LIFT', 'CLICKS', 'ENGAGED_USERS', 'EVENT_RESPONSES', 'IMPRESSIONS', 'LEAD_GENERATION', 'LINK_CLICKS', 'OFFER_CLAIMS', 'PAGE_LIKES', 'POST_ENGAGEMENT', 'REACH', 'SOCIAL_IMPRESSIONS', 'VIDEO_VIEWS', 'APP_DOWNLOADS', 'LANDING_PAGE_VIEWS', 'VALUE', 'THRUPLAY', 'DERIVED_EVENTS', 'PURCHASE', 'LISTING_INTERACTION', 'CONVERSATIONS'] },
                                 bid_amount: { type: 'number', description: 'Bid amount in cents (optional).' },
                                 daily_budget: { type: 'number', description: 'Daily budget in cents (required if lifetime_budget is not set).' },
                                 lifetime_budget: { type: 'number', description: 'Lifetime budget in cents (required if daily_budget is not set).' },
                                 targeting: { type: 'object', description: 'Targeting criteria object (required). Example: {"geo_locations":{"countries":["US"]}}', properties: { geo_locations: { type: 'object', properties: { countries: { type: 'array', items: { type: 'string' } } }, required: ['countries'] } }, required: ['geo_locations'] },
                                 start_time: { type: 'string', format: 'date-time', description: 'Start time (ISO 8601, optional).' },
                                 end_time: { type: 'string', format: 'date-time', description: 'End time (ISO 8601, optional).' },
                             },
                             required: ['campaign_id', 'name', 'billing_event', 'optimization_goal', 'targeting'], // Budget is handled by handler logic check
                         },
                     },
                     { name: 'update_adset', description: '...', inputSchema: { type: 'object', properties: { adset_id: { type: 'string' }, name: { type: 'string' } /* ... */ }, required: ['adset_id'] } },
                     { name: 'delete_adset', description: '...', inputSchema: { type: 'object', properties: { adset_id: { type: 'string' } }, required: ['adset_id'] } },
                     { name: 'list_adcreatives', description: 'List ad creatives for the configured ad account.', inputSchema: { type: 'object', properties: {} } },
                     {
                         name: 'create_adcreative',
                         description: 'Create a new ad creative (currently supports basic link creatives).',
                         inputSchema: {
                             type: 'object',
                             properties: {
                                 name: { type: 'string', description: 'Name of the creative.' },
                                 object_story_spec: {
                                     type: 'object',
                                     description: 'Object story spec defining the creative content.',
                                     properties: {
                                         page_id: { type: 'string', description: 'ID of the Facebook Page.' },
                                         link_data: {
                                             type: 'object',
                                             properties: {
                                                 link: { type: 'string', description: 'Destination URL.' },
                                                 message: { type: 'string', description: 'Primary text.' },
                                                 image_hash: { type: 'string', description: 'Hash of the uploaded image (use upload_ad_media tool).' }
                                             },
                                             required: ['link', 'message', 'image_hash']
                                         }
                                         // Add other creative types like video_data later if needed
                                     },
                                     required: ['page_id', 'link_data']
                                 },
                             },
                             required: ['name', 'object_story_spec'],
                         },
                     },
                     { name: 'list_ads', description: 'List ads within a specific ad set or for the entire ad account.', inputSchema: { type: 'object', properties: { adset_id: { type: 'string', description: 'Optional: Ad set ID to filter by.' }, status: { type: 'string', description: 'Filter by status. Defaults to ACTIVE.', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES'], default: 'ACTIVE' } } } },
                     { name: 'create_ad', description: 'Create a new ad within an ad set.', inputSchema: { type: 'object', properties: { adset_id: { type: 'string', description: 'Ad set ID.' }, name: { type: 'string', description: 'Ad name.' }, status: { type: 'string', enum: ['ACTIVE', 'PAUSED'], default: 'PAUSED', description: 'Initial status.' }, creative_id: { type: 'string', description: 'AdCreative ID.' } }, required: ['adset_id', 'name', 'status', 'creative_id'] } },
                     { name: 'update_ad', description: 'Update an existing ad.', inputSchema: { type: 'object', properties: { ad_id: { type: 'string', description: 'The ID of the ad to update.' }, name: { type: 'string', description: 'New name.' }, status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'], description: 'New status.' }, creative_id: { type: 'string', description: 'New AdCreative ID.' } }, required: ['ad_id'] } },
                     { name: 'delete_ad', description: 'Delete an ad.', inputSchema: { type: 'object', properties: { ad_id: { type: 'string', description: 'The ID of the ad to delete.' } }, required: ['ad_id'] } },
                     { name: 'get_campaign_insights', description: '...', inputSchema: { type: 'object', properties: { campaign_ids: { type: 'array' } /* ... */ } } },
                     { name: 'get_adset_insights', description: '...', inputSchema: { type: 'object', properties: { adset_ids: { type: 'array' } /* ... */ } } },
                     { name: 'get_ad_insights', description: '...', inputSchema: { type: 'object', properties: { ad_ids: { type: 'array' } /* ... */ } } },
                     { name: 'list_businesses', description: '...', inputSchema: { type: 'object', properties: {} } },
                     { name: 'get_business_ad_accounts', description: '...', inputSchema: { type: 'object', properties: { business_id: { type: 'string' } }, required: ['business_id'] } },
                     { name: 'get_business_pages', description: '...', inputSchema: { type: 'object', properties: { business_id: { type: 'string' } }, required: ['business_id'] } },
                     { name: 'list_business_catalogs', description: '...', inputSchema: { type: 'object', properties: { business_id: { type: 'string' } }, required: ['business_id'] } },
                     { name: 'upload_ad_media', description: '...', inputSchema: { type: 'object', properties: { file_path: { type: 'string' } }, required: ['file_path'] } },
                     { name: 'list_custom_audiences', description: '...', inputSchema: { type: 'object', properties: {} } },
                     { name: 'create_custom_audience', description: '...', inputSchema: { type: 'object', properties: { name: { type: 'string' }, subtype: { type: 'string' } }, required: ['name', 'subtype'] } },
                     { name: 'create_lookalike_audience', description: '...', inputSchema: { type: 'object', properties: { name: { type: 'string' }, origin_audience_id: { type: 'string' }, lookalike_spec: { type: 'object' } }, required: ['name', 'origin_audience_id', 'lookalike_spec'] } },
                     { name: 'add_users_to_custom_audience', description: '...', inputSchema: { type: 'object', properties: { audience_id: { type: 'string' }, users: { type: 'array' }, schema: { type: 'string' } }, required: ['audience_id', 'users', 'schema'] } },
                     { name: 'delete_custom_audience', description: '...', inputSchema: { type: 'object', properties: { audience_id: { type: 'string' } }, required: ['audience_id'] } },
                     { name: 'ads_management_overview', description: '...', inputSchema: { type: 'object', properties: {} } },
                ],
            })
        });
        console.error("[ToolHandlers] ListToolsRequestSchema handler set.");

        // --- Handle Tool Calls ---
        this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
            console.error(`[CallTool] Received tool call: ${request.params.name} with args: ${JSON.stringify(request.params.arguments)}`);
            try {
                if (!apiInstance) {
                     console.error("[CallTool] Attempted tool call before API was initialized.");
                     throw new Error("Facebook API not initialized yet. Please wait a moment and try again.");
                }

                // Tool routing logic... (Full routing restored)
                if (request.params.name === 'list_campaigns') {
                    return await this.handleListCampaigns(request.params.arguments);
                } else if (request.params.name === 'create_campaign') {
                    return await this.handleCreateCampaign(request.params.arguments);
                } else if (request.params.name === 'update_campaign') {
                    return await this.handleUpdateCampaign(request.params.arguments);
                } else if (request.params.name === 'delete_campaign') {
                    return await this.handleDeleteCampaign(request.params.arguments);
                } else if (request.params.name === 'list_adsets') {
                    return await this.handleListAdSets(request.params.arguments);
                } else if (request.params.name === 'create_adset') {
                    return await this.handleCreateAdSet(request.params.arguments);
                } else if (request.params.name === 'update_adset') {
                    return await this.handleUpdateAdSet(request.params.arguments);
                } else if (request.params.name === 'delete_adset') {
                    return await this.handleDeleteAdSet(request.params.arguments);
                } else if (request.params.name === 'list_adcreatives') {
                    return await this.handleListAdCreatives(request.params.arguments);
                } else if (request.params.name === 'create_adcreative') {
                    return await this.handleCreateAdCreative(request.params.arguments);
                } else if (request.params.name === 'list_ads') {
                    return await this.handleListAds(request.params.arguments);
                } else if (request.params.name === 'create_ad') {
                    return await this.handleCreateAd(request.params.arguments);
                } else if (request.params.name === 'update_ad') {
                    return await this.handleUpdateAd(request.params.arguments);
                } else if (request.params.name === 'delete_ad') {
                    return await this.handleDeleteAd(request.params.arguments);
                } else if (request.params.name === 'get_campaign_insights') {
                    return await this.handleGetCampaignInsights(request.params.arguments);
                } else if (request.params.name === 'get_adset_insights') {
                    return await this.handleGetAdSetInsights(request.params.arguments);
                } else if (request.params.name === 'get_ad_insights') {
                    return await this.handleGetAdInsights(request.params.arguments);
                } else if (request.params.name === 'ads_management_overview') {
                     return await this.handleAdsManagementOverview();
                } else if (request.params.name === 'list_businesses') {
                    return await this.handleListBusinesses(request.params.arguments);
                } else if (request.params.name === 'get_business_ad_accounts') {
                    return await this.handleGetBusinessAdAccounts(request.params.arguments);
                } else if (request.params.name === 'get_business_pages') {
                    return await this.handleGetBusinessPages(request.params.arguments);
                } else if (request.params.name === 'list_business_catalogs') {
                    return await this.handleListBusinessCatalogs(request.params.arguments);
                } else if (request.params.name === 'upload_ad_media') {
                    return await this.handleUploadAdMedia(request.params.arguments);
                } else if (request.params.name === 'list_custom_audiences') {
                    return await this.handleListCustomAudiences(request.params.arguments);
                } else if (request.params.name === 'create_custom_audience') {
                    return await this.handleCreateCustomAudience(request.params.arguments);
                } else if (request.params.name === 'create_lookalike_audience') {
                    return await this.handleCreateLookalikeAudience(request.params.arguments);
                } else if (request.params.name === 'add_users_to_custom_audience') {
                    return await this.handleAddUsersToCustomAudience(request.params.arguments);
                } else if (request.params.name === 'delete_custom_audience') {
                    return await this.handleDeleteCustomAudience(request.params.arguments);
                } else {
                    console.error(`[CallTool] Unknown tool requested: ${request.params.name}`);
                    throw new McpError(
                        ErrorCode.MethodNotFound,
                        `Unknown tool: ${request.params.name}`
                    );
                }
            } catch (error: any) {
                 console.error(`[CallTool] Error handling tool call ${request.params.name}:`, error);
                 const apiErrorData = error?.response?.data?.error;
                 let errorMessage = `An internal error occurred while handling tool ${request.params.name}.`;
                 if (apiErrorData) {
                     errorMessage = `Facebook API Error (${request.params.name}): ${apiErrorData.message || 'Unknown API error'} (Code: ${apiErrorData.code}, Subcode: ${apiErrorData.error_subcode}, Trace ID: ${apiErrorData.fbtrace_id})`;
                 } else if (error instanceof McpError) {
                     errorMessage = error.message;
                 } else if (error.message) {
                     errorMessage = `Error (${request.params.name}): ${error.message}`;
                 }
                 return { content: [{ type: 'text', text: errorMessage }], isError: true };
            }
        });
        console.error("[ToolHandlers] CallToolRequestSchema handler set.");
    } // Closing brace for setupToolHandlers method

    // --- Tool Logic Methods (Restored - Full implementation needed here) ---
    // --- Tool Logic: List Campaigns ---
    private async handleListCampaigns(args: any) {
        const campaignStatus = args?.status || 'ACTIVE'; // Default to ACTIVE if not provided
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        console.error(`Attempting to fetch campaign fields (id, name, status, objective) for account: ${AD_ACCOUNT_ID}`);
        const account = new AdAccount(AD_ACCOUNT_ID);
        const fieldsToFetch = [Campaign.Fields.id, Campaign.Fields.name, Campaign.Fields.status, Campaign.Fields.objective]; // Revert to SDK constants
        const params = { [Campaign.Parameters.effective_status]: [campaignStatus] }; // Revert to SDK constants
        let campaigns = await account.getCampaigns(fieldsToFetch, params);
        console.error(`Received ${campaigns ? campaigns.length : 'null/undefined'} raw campaign objects from API.`);
        if (!Array.isArray(campaigns)) throw new Error("Invalid response received from Facebook API (expected an array).");
        let campaignData: any[] = [];
        for (let i = 0; i < campaigns.length; i++) {
            const campaign = campaigns[i];
            if (!campaign || typeof campaign !== 'object') { console.error(`Skipping invalid campaign object at index ${i}:`, campaign); continue; }
            campaignData.push(campaign._data || campaign);
        }
        console.error(`Successfully processed ${campaignData.length} campaigns.`);
        return { content: [{ type: 'text', text: JSON.stringify(campaignData, null, 2) }] };
    }
    // --- Tool Logic: Create Campaign ---
    private async handleCreateCampaign(args: any) {
        console.error("Handling create_campaign with args:", args);
        if (!args || typeof args !== 'object' || !args.name || !args.objective) throw new McpError(ErrorCode.InvalidParams, 'Missing required fields name or objective.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        const campaignParams = {
            [Campaign.Fields.name]: args.name,
            [Campaign.Fields.objective]: args.objective,
            [Campaign.Fields.status]: args.status || Campaign.Status.paused,
            [Campaign.Fields.special_ad_categories]: args.special_ad_categories || [],
        };
        console.error(`Attempting to create campaign with params: ${JSON.stringify(campaignParams)}`);
        const newCampaign = await account.createCampaign([], campaignParams);
        console.error(`Successfully created campaign with ID: ${newCampaign.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(newCampaign._data || { id: newCampaign.id }, null, 2) }] };
    }
    // --- Tool Logic: Update Campaign ---
    private async handleUpdateCampaign(args: any) {
        console.error("Handling update_campaign with args:", args);
        if (!args || typeof args !== 'object' || !args.campaign_id) throw new McpError(ErrorCode.InvalidParams, 'Missing required field campaign_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const campaign = new Campaign(args.campaign_id);
        const updateParams: { [key: string]: any } = {};
        if (args.name) updateParams[Campaign.Fields.name] = args.name;
        if (args.objective) updateParams[Campaign.Fields.objective] = args.objective;
        if (args.status) updateParams[Campaign.Fields.status] = args.status;
        if (args.special_ad_categories) updateParams[Campaign.Fields.special_ad_categories] = args.special_ad_categories;
        if (Object.keys(updateParams).length === 0) throw new McpError(ErrorCode.InvalidParams, 'No update parameters provided.');
        console.error(`Attempting to update campaign ${args.campaign_id} with params: ${JSON.stringify(updateParams)}`);
        await campaign.update([], updateParams);
        console.error(`Successfully updated campaign ${args.campaign_id}`);
        const updatedCampaignData = await new Campaign(args.campaign_id).read([Campaign.Fields.id, Campaign.Fields.name, Campaign.Fields.status, Campaign.Fields.objective]);
        return { content: [{ type: 'text', text: JSON.stringify(updatedCampaignData._data || { id: args.campaign_id, ...updateParams }, null, 2) }] };
    }
    // --- Tool Logic: Delete Campaign ---
    private async handleDeleteCampaign(args: any) {
        console.error("Handling delete_campaign with args:", args);
        if (!args || typeof args !== 'object' || !args.campaign_id) throw new McpError(ErrorCode.InvalidParams, 'Missing required field campaign_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const campaign = new Campaign(args.campaign_id);
        console.error(`Attempting to delete campaign ${args.campaign_id}`);
        const result = await campaign.delete();
        console.error(`Successfully deleted campaign ${args.campaign_id}`);
        return { content: [{ type: 'text', text: JSON.stringify(result || { success: true, id: args.campaign_id }) }] };
    }
    // --- Tool Logic: List Ad Sets ---
    private async handleListAdSets(args: any) {
        console.error("Handling list_adsets with args:", args);
        const campaignId = args?.campaign_id;
        const adSetStatus = args?.status || 'ACTIVE';
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const fieldsToFetch = [AdSet.Fields.id, AdSet.Fields.name, AdSet.Fields.status, AdSet.Fields.campaign_id, AdSet.Fields.daily_budget, AdSet.Fields.lifetime_budget, AdSet.Fields.optimization_goal, AdSet.Fields.billing_event, AdSet.Fields.start_time, AdSet.Fields.end_time];
        const params = { 'status': [adSetStatus], limit: 100 }; // Use string literal for parameter
        let adSets;
        if (campaignId) { console.error(`Fetching ad sets for campaign ${campaignId} with status ${adSetStatus}`); const campaign = new Campaign(campaignId); adSets = await campaign.getAdSets(fieldsToFetch, params); }
        else { console.error(`Fetching ad sets for account ${AD_ACCOUNT_ID} with status ${adSetStatus}`); const account = new AdAccount(AD_ACCOUNT_ID); adSets = await account.getAdSets(fieldsToFetch, params); }
        console.error(`Received ${adSets ? adSets.length : 'null/undefined'} raw ad set objects.`);
        if (!Array.isArray(adSets)) throw new Error("Invalid response received from Facebook API (expected an array for ad sets).");
        const adSetData = adSets.map(adSet => adSet._data || adSet);
        console.error(`Successfully processed ${adSetData.length} ad sets.`);
        return { content: [{ type: 'text', text: JSON.stringify(adSetData, null, 2) }] };
    }
    // --- Tool Logic: Create Ad Set ---
    private async handleCreateAdSet(args: any) {
        console.error("Handling create_adset with args:", args);
        if (!args || typeof args !== 'object' || !args.campaign_id || !args.name || !args.billing_event || !args.optimization_goal || !args.targeting || (!args.daily_budget && !args.lifetime_budget)) throw new McpError(ErrorCode.InvalidParams,'Missing required fields for ad set creation (campaign_id, name, billing_event, optimization_goal, targeting, and budget).');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        const adSetParams: { [key: string]: any } = {
            [AdSet.Fields.campaign_id]: args.campaign_id, [AdSet.Fields.name]: args.name, [AdSet.Fields.status]: args.status || AdSet.Status.paused,
            [AdSet.Fields.billing_event]: args.billing_event, [AdSet.Fields.optimization_goal]: args.optimization_goal, [AdSet.Fields.targeting]: args.targeting,
        };
        if (args.daily_budget) adSetParams[AdSet.Fields.daily_budget] = args.daily_budget;
        if (args.lifetime_budget) adSetParams[AdSet.Fields.lifetime_budget] = args.lifetime_budget;
        if (args.bid_amount) adSetParams[AdSet.Fields.bid_amount] = args.bid_amount;
        if (args.start_time) adSetParams[AdSet.Fields.start_time] = args.start_time;
        if (args.end_time) adSetParams[AdSet.Fields.end_time] = args.end_time;
        console.error(`Attempting to create ad set with params: ${JSON.stringify(adSetParams)}`);
        const newAdSet = await account.createAdSet([], adSetParams);
        console.error(`Successfully created ad set with ID: ${newAdSet.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(newAdSet._data || { id: newAdSet.id }, null, 2) }] };
    }
    // --- Tool Logic: Update Ad Set ---
    private async handleUpdateAdSet(args: any) {
        console.error("Handling update_adset with args:", args);
        if (!args || typeof args !== 'object' || !args.adset_id) throw new McpError(ErrorCode.InvalidParams,'Missing required field adset_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const adSet = new AdSet(args.adset_id);
        const updateParams: { [key: string]: any } = {};
        if (args.name) updateParams[AdSet.Fields.name] = args.name;
        if (args.status) updateParams[AdSet.Fields.status] = args.status;
        if (args.bid_amount) updateParams[AdSet.Fields.bid_amount] = args.bid_amount;
        if (args.daily_budget) updateParams[AdSet.Fields.daily_budget] = args.daily_budget;
        if (args.lifetime_budget) updateParams[AdSet.Fields.lifetime_budget] = args.lifetime_budget;
        if (args.targeting) updateParams[AdSet.Fields.targeting] = args.targeting;
        if (args.start_time) updateParams[AdSet.Fields.start_time] = args.start_time;
        if (args.end_time) updateParams[AdSet.Fields.end_time] = args.end_time;
        if (args.billing_event) updateParams[AdSet.Fields.billing_event] = args.billing_event;
        if (args.optimization_goal) updateParams[AdSet.Fields.optimization_goal] = args.optimization_goal;
        if (Object.keys(updateParams).length === 0) throw new McpError(ErrorCode.InvalidParams,'No update parameters provided for ad set.');
        console.error(`Attempting to update ad set ${args.adset_id} with params: ${JSON.stringify(updateParams)}`);
        await adSet.update([], updateParams);
        console.error(`Successfully updated ad set ${args.adset_id}`);
        const updatedAdSetData = await new AdSet(args.adset_id).read([AdSet.Fields.id, AdSet.Fields.name, AdSet.Fields.status, AdSet.Fields.campaign_id, AdSet.Fields.daily_budget, AdSet.Fields.lifetime_budget]);
        return { content: [{ type: 'text', text: JSON.stringify(updatedAdSetData._data || { id: args.adset_id, ...updateParams }, null, 2) }] };
    }
    // --- Tool Logic: Delete Ad Set ---
    private async handleDeleteAdSet(args: any) {
        console.error("Handling delete_adset with args:", args);
        if (!args || typeof args !== 'object' || !args.adset_id) throw new McpError(ErrorCode.InvalidParams,'Missing required field adset_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const adSet = new AdSet(args.adset_id);
        console.error(`Attempting to delete ad set ${args.adset_id}`);
        const result = await adSet.delete();
        console.error(`Successfully deleted ad set ${args.adset_id}`);
        return { content: [{ type: 'text', text: JSON.stringify(result || { success: true, id: args.adset_id }) }] };
    }
    // --- Tool Logic: List Ad Creatives ---
    private async handleListAdCreatives(args: any) {
        console.error("Handling list_adcreatives with args:", args);
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        const fieldsToFetch = [AdCreative.Fields.id, AdCreative.Fields.name, AdCreative.Fields.object_story_spec, AdCreative.Fields.status, AdCreative.Fields.thumbnail_url];
        const params = { limit: 100 };
        console.error(`Fetching ad creatives for account ${AD_ACCOUNT_ID}`);
        const creatives = await account.getAdCreatives(fieldsToFetch, params);
        console.error(`Received ${creatives ? creatives.length : 'null/undefined'} raw ad creative objects.`);
        if (!Array.isArray(creatives)) throw new Error("Invalid response received from Facebook API (expected an array for ad creatives).");
        const creativeData = creatives.map(creative => creative._data || creative);
        console.error(`Successfully processed ${creativeData.length} ad creatives.`);
        return { content: [{ type: 'text', text: JSON.stringify(creativeData, null, 2) }] };
    }
    // --- Tool Logic: Create Ad Creative ---
    private async handleCreateAdCreative(args: any) {
        console.error("Handling create_adcreative with args:", args);
        if (!args || typeof args !== 'object' || !args.name || !args.object_story_spec) throw new McpError(ErrorCode.InvalidParams,'Missing required fields name or object_story_spec.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        const creativeParams: { [key: string]: any } = { [AdCreative.Fields.name]: args.name, [AdCreative.Fields.object_story_spec]: args.object_story_spec };
        console.error(`Attempting to create ad creative with params: ${JSON.stringify(creativeParams)}`);
        const newCreative = await account.createAdCreative([], creativeParams);
        console.error(`Successfully created ad creative with ID: ${newCreative.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(newCreative._data || { id: newCreative.id }, null, 2) }] };
    }
     // --- Tool Logic: List Ads ---
    private async handleListAds(args: any) {
        console.error("Handling list_ads with args:", args);
        const adSetId = args?.adset_id;
        const adStatus = args?.status || 'ACTIVE';
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const fieldsToFetch = [Ad.Fields.id, Ad.Fields.name, Ad.Fields.status, Ad.Fields.adset_id, Ad.Fields.campaign_id, Ad.Fields.creative];
         const params = { 'status': [adStatus], limit: 100 }; // Use string literal for parameter
        let ads;
        if (adSetId) { console.error(`Fetching ads for ad set ${adSetId} with status ${adStatus}`); const adSet = new AdSet(adSetId); ads = await adSet.getAds(fieldsToFetch, params); }
        else { console.error(`Fetching ads for account ${AD_ACCOUNT_ID} with status ${adStatus}`); const account = new AdAccount(AD_ACCOUNT_ID); ads = await account.getAds(fieldsToFetch, params); }
        console.error(`Received ${ads ? ads.length : 'null/undefined'} raw ad objects.`);
        if (!Array.isArray(ads)) throw new Error("Invalid response received from Facebook API (expected an array for ads).");
        const adData = ads.map(ad => ad._data || ad);
        console.error(`Successfully processed ${adData.length} ads.`);
        return { content: [{ type: 'text', text: JSON.stringify(adData, null, 2) }] };
    }
    // --- Tool Logic: Create Ad ---
    private async handleCreateAd(args: any) {
        console.error("Handling create_ad with args:", args);
        if (!args || typeof args !== 'object' || !args.adset_id || !args.name || !args.status || !args.creative_id) throw new McpError(ErrorCode.InvalidParams,'Missing required fields adset_id, name, status, or creative_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        const adParams: { [key: string]: any } = { [Ad.Fields.adset_id]: args.adset_id, [Ad.Fields.name]: args.name, [Ad.Fields.status]: args.status, [Ad.Fields.creative]: { creative_id: args.creative_id } };
        console.error(`Attempting to create ad with params: ${JSON.stringify(adParams)}`);
        const newAd = await account.createAd([], adParams);
        console.error(`Successfully created ad with ID: ${newAd.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(newAd._data || { id: newAd.id }, null, 2) }] };
    }
    // --- Tool Logic: Update Ad ---
    private async handleUpdateAd(args: any) {
        console.error("Handling update_ad with args:", args);
        if (!args || typeof args !== 'object' || !args.ad_id) throw new McpError(ErrorCode.InvalidParams,'Missing required field ad_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const ad = new Ad(args.ad_id);
        const updateParams: { [key: string]: any } = {};
        if (args.name) updateParams[Ad.Fields.name] = args.name;
        if (args.status) updateParams[Ad.Fields.status] = args.status;
        if (args.creative_id) updateParams[Ad.Fields.creative] = { creative_id: args.creative_id };
        if (Object.keys(updateParams).length === 0) throw new McpError(ErrorCode.InvalidParams,'No update parameters provided for ad.');
        console.error(`Attempting to update ad ${args.ad_id} with params: ${JSON.stringify(updateParams)}`);
        await ad.update([], updateParams);
        console.error(`Successfully updated ad ${args.ad_id}`);
        const updatedAdData = await new Ad(args.ad_id).read([Ad.Fields.id, Ad.Fields.name, Ad.Fields.status, Ad.Fields.creative]);
        return { content: [{ type: 'text', text: JSON.stringify(updatedAdData._data || { id: args.ad_id, ...updateParams }, null, 2) }] };
    }
    // --- Tool Logic: Delete Ad ---
    private async handleDeleteAd(args: any) {
        console.error("Handling delete_ad with args:", args);
         if (!args || typeof args !== 'object' || !args.ad_id) throw new McpError(ErrorCode.InvalidParams,'Missing required field ad_id.');
         if (!apiInstance) throw new Error("Facebook API not initialized.");
         const ad = new Ad(args.ad_id);
         console.error(`Attempting to delete ad ${args.ad_id}`);
         const result = await ad.delete();
         console.error(`Successfully deleted ad ${args.ad_id}`);
         return { content: [{ type: 'text', text: JSON.stringify(result || { success: true, id: args.ad_id }) }] };
    }
    // --- Generic Insights Handler ---
    private async handleGetInsights(level: 'campaign' | 'adset' | 'ad', ids: string[] | undefined, args: any) {
        const defaultFields = {
            campaign: ['campaign_id', 'campaign_name', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'frequency'],
            adset: ['adset_id', 'adset_name', 'campaign_id', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'frequency'],
            ad: ['ad_id', 'ad_name', 'adset_id', 'campaign_id', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'frequency'],
        };
        const fields = args?.fields || defaultFields[level];
        const datePreset = args?.date_preset || 'last_7d';
        const params: { [key: string]: any } = { level: level, fields: fields, date_preset: datePreset, limit: 500 };
         if (ids && ids.length > 0) params.filtering = [{ field: `${level}.id`, operator: 'IN', value: ids }];
        console.error(`Handling get_${level}_insights with args:`, args, `and IDs: ${ids?.join(',')}`);
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        console.error(`Fetching ${level} insights for account ${AD_ACCOUNT_ID} with params: ${JSON.stringify(params)}`);
        const insights = await account.getInsights(fields, params);
        console.error(`Received ${insights ? insights.length : 'null/undefined'} raw insight objects.`);
        if (!Array.isArray(insights)) throw new Error(`Invalid response received from Facebook API (expected an array for ${level} insights).`);
        const insightData = insights.map(insight => insight._data || insight);
        console.error(`Successfully processed ${insightData.length} ${level} insights.`);
        return { content: [{ type: 'text', text: JSON.stringify(insightData, null, 2) }] };
    }
    // --- Tool Logic: Get Campaign Insights ---
    private async handleGetCampaignInsights(args: any) {
        return this.handleGetInsights('campaign', args?.campaign_ids, args);
    }
    // --- Tool Logic: Get Ad Set Insights ---
    private async handleGetAdSetInsights(args: any) {
        return this.handleGetInsights('adset', args?.adset_ids, args);
    }
    // --- Tool Logic: Get Ad Insights ---
    private async handleGetAdInsights(args: any) {
        return this.handleGetInsights('ad', args?.ad_ids, args);
    }

    // --- Tool Logic: Ads Management Overview ---
    private async handleAdsManagementOverview() {
        console.error("Handling ads_management_overview");
        const overviewText = `The 'ads_management' scope allows full control over your Facebook Ads. This server provides specific tools to leverage this scope:\n` +
                             `- Campaign Management: list_campaigns, create_campaign, update_campaign, delete_campaign\n` +
                             `- Ad Set Management: list_adsets, create_adset, update_adset, delete_adset\n` +
                             `- Ad Creative Management: list_adcreatives, create_adcreative\n` +
                             `- Ad Management: list_ads, create_ad, update_ad, delete_ad\n` +
                             `- Insights: get_campaign_insights, get_adset_insights, get_ad_insights\n` +
                             `Ensure your access token has the 'ads_management' permission granted.`;
        return { content: [{ type: 'text', text: overviewText }] };
    }

    // --- NEW Business Management Handlers ---
    // --- Tool Logic: List Businesses ---
    private async handleListBusinesses(args: any) {
        console.error("Handling list_businesses with args:", args);
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const response = await apiInstance.call('GET', ['me', 'businesses'], { fields: 'id,name' });
        console.error("Received response from /me/businesses:", response);
        const businesses = response?.data || response;
        if (!Array.isArray(businesses)) {
             console.error("API did not return an array for businesses. Response:", response);
             throw new Error("Invalid response received from Facebook API for businesses (expected an array).");
        }
        console.error(`Successfully fetched ${businesses.length} businesses.`);
        return { content: [{ type: 'text', text: JSON.stringify(businesses, null, 2) }] };
    }

    // --- Tool Logic: Get Business Ad Accounts ---
    private async handleGetBusinessAdAccounts(args: any) {
        console.error("Handling get_business_ad_accounts with args:", args);
        if (!args || typeof args !== 'object' || !args.business_id) throw new McpError(ErrorCode.InvalidParams,'Missing required field business_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const business = new Business(args.business_id);
        const fieldsToFetch = [AdAccount.Fields.id, AdAccount.Fields.name, AdAccount.Fields.account_status];
        console.error(`Fetching ad accounts for business ${args.business_id}`);
        const adAccounts = await business.getOwnedAdAccounts(fieldsToFetch);
        console.error(`Received ${adAccounts ? adAccounts.length : 'null/undefined'} raw ad account objects.`);
        if (!Array.isArray(adAccounts)) throw new Error("Invalid response received from Facebook API for business ad accounts (expected an array).");
        const adAccountData = adAccounts.map(acc => acc._data || acc);
        console.error(`Successfully processed ${adAccountData.length} ad accounts.`);
        return { content: [{ type: 'text', text: JSON.stringify(adAccountData, null, 2) }] };
    }

    // --- Tool Logic: Get Business Pages ---
    private async handleGetBusinessPages(args: any) {
        console.error("Handling get_business_pages with args:", args);
        if (!args || typeof args !== 'object' || !args.business_id) throw new McpError(ErrorCode.InvalidParams,'Missing required field business_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const business = new Business(args.business_id);
        const fieldsToFetch = [Page.Fields.id, Page.Fields.name, Page.Fields.category];
        console.error(`Fetching pages for business ${args.business_id}`);
        const pages = await business.getOwnedPages(fieldsToFetch);
        console.error(`Received ${pages ? pages.length : 'null/undefined'} raw page objects.`);
        if (!Array.isArray(pages)) throw new Error("Invalid response received from Facebook API for business pages (expected an array).");
        const pageData = pages.map(page => page._data || page);
        console.error(`Successfully processed ${pageData.length} pages.`);
        return { content: [{ type: 'text', text: JSON.stringify(pageData, null, 2) }] };
    }

    // --- Tool Logic: List Business Catalogs ---
    private async handleListBusinessCatalogs(args: any) {
        console.error("Handling list_business_catalogs with args:", args);
        if (!args || typeof args !== 'object' || !args.business_id) throw new McpError(ErrorCode.InvalidParams,'Missing required field business_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const business = new Business(args.business_id);
        // Assuming a method like getProductCatalogs exists or using a generic API call
        // The SDK might not have a direct method, adjust as needed.
        // Example using a hypothetical method:
        // const catalogs = await business.getProductCatalogs(['id', 'name']);
        // Example using generic call (adjust endpoint if needed):
        console.error(`Fetching product catalogs for business ${args.business_id}`);
        const response = await apiInstance.call('GET', [args.business_id, 'product_catalogs'], { fields: 'id,name' });
        console.error("Received response from /product_catalogs:", response);
        const catalogs = response?.data || response; // Adjust based on actual API response structure
        if (!Array.isArray(catalogs)) {
            console.error("API did not return an array for catalogs. Response:", response);
            throw new Error("Invalid response received from Facebook API for business catalogs (expected an array).");
        }
        console.error(`Successfully fetched ${catalogs.length} catalogs.`);
        return { content: [{ type: 'text', text: JSON.stringify(catalogs, null, 2) }] };
    }

    // --- Tool Logic: Upload Ad Media ---
    private async handleUploadAdMedia(args: any) {
        console.error("Handling upload_ad_media with args:", args);
        if (!args || typeof args !== 'object' || !args.file_path) throw new McpError(ErrorCode.InvalidParams,'Missing required field file_path.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");

        const filePath = args.file_path;
        if (!fs.existsSync(filePath)) throw new McpError(ErrorCode.InvalidParams, `File not found at path: ${filePath}`);

        const account = new AdAccount(AD_ACCOUNT_ID);
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const fileExtension = path.extname(fileName).toLowerCase();

        console.error(`Attempting to upload media file: ${fileName} (${fileExtension})`);

        let result;
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
            // Upload image
            result = await account.createAdImage([], {
                bytes: fileBuffer.toString('base64'), // Send as base64 encoded string
                name: fileName,
            });
            console.error(`Successfully uploaded image. Hash: ${result?.hash}`);
            return { content: [{ type: 'text', text: JSON.stringify({ image_hash: result?.hash, id: result?.id }, null, 2) }] };
        } else if (['.mp4', '.mov', '.avi', '.wmv'].includes(fileExtension)) { // Add other supported video formats
            // Upload video
            result = await account.createAdVideo([], {
                // Video uploads often require different parameters or chunked uploads
                // This is a simplified example, refer to FB SDK docs for robust video upload
                source: filePath, // SDK might handle file path directly for videos
                name: fileName,
                description: args.description || 'Uploaded video',
            });
             console.error(`Successfully uploaded video. ID: ${result?.id}`);
            return { content: [{ type: 'text', text: JSON.stringify({ video_id: result?.id }, null, 2) }] };
        } else {
            throw new McpError(ErrorCode.InvalidParams, `Unsupported file type: ${fileExtension}. Please upload images (jpg, png, gif) or videos (mp4, mov, etc.).`);
        }
    }

    // --- Tool Logic: List Custom Audiences ---
    private async handleListCustomAudiences(args: any) {
        console.error("Handling list_custom_audiences with args:", args);
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        const fieldsToFetch = [CustomAudience.Fields.id, CustomAudience.Fields.name, CustomAudience.Fields.subtype, CustomAudience.Fields.description, CustomAudience.Fields.delivery_status, CustomAudience.Fields.operation_status]; // Revert to SDK constants
        const params = { limit: 100 }; // Adjust limit as needed
        console.error(`Fetching custom audiences for account ${AD_ACCOUNT_ID}`);
        const audiences = await account.getCustomAudiences(fieldsToFetch, params);
        console.error(`Received ${audiences ? audiences.length : 'null/undefined'} raw audience objects.`);
        if (!Array.isArray(audiences)) throw new Error("Invalid response received from Facebook API for custom audiences (expected an array).");
        const audienceData = audiences.map(aud => aud._data || aud);
        console.error(`Successfully processed ${audienceData.length} audiences.`);
        return { content: [{ type: 'text', text: JSON.stringify(audienceData, null, 2) }] };
    }
    // --- Tool Logic: Create Custom Audience ---
    private async handleCreateCustomAudience(args: any) {
        console.error("Handling create_custom_audience with args:", args);
        if (!args || typeof args !== 'object' || !args.name || !args.subtype) throw new McpError(ErrorCode.InvalidParams,'Missing required fields name or subtype.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        const params: { [key: string]: any } = {
            [CustomAudience.Fields.name]: args.name,
            [CustomAudience.Fields.subtype]: args.subtype,
        };
        if (args.description) params[CustomAudience.Fields.description] = args.description;
        if (args.customer_file_source) params[CustomAudience.Fields.customer_file_source] = args.customer_file_source;
        if (args.rule) params[CustomAudience.Fields.rule] = args.rule; // Expects JSON string or object based on SDK

        console.error(`Attempting to create custom audience with params: ${JSON.stringify(params)}`);
        const newAudience = await account.createCustomAudience([], params);
        console.error(`Successfully created custom audience with ID: ${newAudience.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(newAudience._data || { id: newAudience.id }, null, 2) }] };
    }
    // --- Tool Logic: Create Lookalike Audience ---
    private async handleCreateLookalikeAudience(args: any) {
        console.error("Handling create_lookalike_audience with args:", args);
        if (!args || typeof args !== 'object' || !args.name || !args.origin_audience_id || !args.lookalike_spec) throw new McpError(ErrorCode.InvalidParams,'Missing required fields name, origin_audience_id, or lookalike_spec.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const account = new AdAccount(AD_ACCOUNT_ID);
        const params: { [key: string]: any } = {
            [CustomAudience.Fields.name]: args.name,
            [CustomAudience.Fields.origin_audience_id]: args.origin_audience_id,
            [CustomAudience.Fields.lookalike_spec]: JSON.stringify(args.lookalike_spec), // Spec often needs to be stringified
            [CustomAudience.Fields.subtype]: 'LOOKALIKE', // Explicitly set subtype
        };
        console.error(`Attempting to create lookalike audience with params: ${JSON.stringify(params)}`);
        const newAudience = await account.createCustomAudience([], params);
        console.error(`Successfully created lookalike audience with ID: ${newAudience.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(newAudience._data || { id: newAudience.id }, null, 2) }] };
    }
    // --- Tool Logic: Add Users to Custom Audience ---
    private async handleAddUsersToCustomAudience(args: any) {
        console.error("Handling add_users_to_custom_audience with args:", args);
        if (!args || typeof args !== 'object' || !args.audience_id || !args.users || !args.schema || !Array.isArray(args.users) || args.users.length === 0) throw new McpError(ErrorCode.InvalidParams,'Missing required fields audience_id, users (non-empty array), or schema.');
        if (args.users.length > 10000) throw new McpError(ErrorCode.InvalidParams,'Cannot add more than 10,000 users per call.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const audience = new CustomAudience(args.audience_id);
        const payload = { schema: args.schema, data: args.users };
        console.error(`Attempting to add ${args.users.length} users to audience ${args.audience_id} with schema ${args.schema}`);
        const result = await audience.addUsers([], { users: JSON.stringify(payload) });
        console.error(`Successfully added users to audience ${args.audience_id}. Result:`, result);
        return { content: [{ type: 'text', text: JSON.stringify(result || { success: true }, null, 2) }] };
    }
    // --- Tool Logic: Delete Custom Audience ---
    private async handleDeleteCustomAudience(args: any) {
        console.error("Handling delete_custom_audience with args:", args);
        if (!args || typeof args !== 'object' || !args.audience_id) throw new McpError(ErrorCode.InvalidParams,'Missing required field audience_id.');
        if (!apiInstance) throw new Error("Facebook API not initialized.");
        const audience = new CustomAudience(args.audience_id);
        console.error(`Attempting to delete custom audience ${args.audience_id}`);
        const result = await audience.delete();
        console.error(`Successfully deleted custom audience ${args.audience_id}`);
        return { content: [{ type: 'text', text: JSON.stringify(result || { success: true, id: args.audience_id }) }] };
    }

    // --- Start the Server Connection ---
    async connectAndRun() {
        let transport: StdioServerTransport | null = null; // Keep variable declaration
        try {
            console.error("[connectAndRun] Attempting to create StdioServerTransport...");
            transport = new StdioServerTransport(); // Create instance
            console.error("[connectAndRun] StdioServerTransport created.");

            // Removed incorrect .on() listeners

            // Add logging before connect
            console.error("[connectAndRun] PRE-CONNECT: Attempting to connect server to transport...");
            await this.server.connect(transport); // Connect using the created transport instance
            // Add logging after connect
            console.error("[connectAndRun] POST-CONNECT: Server connect call completed.");
            console.error("[connectAndRun] Facebook Ads MCP server connected and running on stdio"); // Restored message

        } catch (connectError) {
             console.error("[connectAndRun] CATCH BLOCK: Error during transport connection:", connectError); // Add log here too
             // Attempt to close transport if it exists and connect failed
             await transport?.close().catch((closeErr: any) => console.error("[connectAndRun] Error closing transport after connection error:", closeErr));
             throw connectError; // Rethrow to be caught by the main catch block
         }
    }
} // Closing brace for FacebookAdsServer class

// --- Main Execution Logic ---
async function main() {
    console.error("[main] Starting main execution..."); // Log 1

    // Validate environment variables first
    console.error("[main] Validating environment variables..."); // Log 2
    if (!ACCESS_TOKEN || !APP_SECRET || !APP_ID || !AD_ACCOUNT_ID) {
        console.error('FATAL: Missing required Facebook credentials in environment variables.');
        process.exit(1); // Exit immediately if config is missing
    }
    console.error("[main] Environment variables validated."); // Log 3

    try {
        // Dynamically import the SDK *inside* the main try block
        console.error("[main] PRE-DYNAMIC-IMPORT: About to import Facebook Business SDK..."); // Log 4
        const Sdk = await import('facebook-nodejs-business-sdk');
        console.error("[main] SDK Imported successfully."); // Log 5

        // Assign to global variables after import
        FacebookAdsApi = Sdk.FacebookAdsApi;
        AdAccount = Sdk.AdAccount;
        Campaign = Sdk.Campaign;
        AdSet = Sdk.AdSet;
        Ad = Sdk.Ad;
        AdCreative = Sdk.AdCreative;
        Insights = Sdk.Insights;
        Business = Sdk.Business;
        Page = Sdk.Page;
        CustomAudience = Sdk.CustomAudience;
        console.error("[main] SDK components assigned to global variables."); // Log 6

        // Initialize the API instance
        console.error("[main] Initializing Facebook Ads API..."); // Log 7
        apiInstance = FacebookAdsApi.init(ACCESS_TOKEN);
        apiInstance.setDebug(false); // Set to true for detailed API call logging
        console.error("[main] Facebook Ads API Initialized successfully."); // Log 8

        // Create and run the server
        console.error("[main] PRE-CONSTRUCTOR: About to create FacebookAdsServer instance..."); // Log 9 - Modified
        const serverInstance = new FacebookAdsServer(); // Constructor logs should appear between PRE and POST
        console.error("[main] POST-CONSTRUCTOR: FacebookAdsServer instance created."); // Log 10 - Modified

        console.error("[main] Running server connection..."); // Log 11
        await serverInstance.connectAndRun(); // connectAndRun logs included
        console.error("[main] Server connection established and running. Waiting for requests..."); // Log 12

        // Keep the process alive indefinitely.
        // The signal/error handlers within FacebookAdsServer will trigger process.exit().
        await new Promise(() => {}); // This promise never resolves

    } catch (error) {
        console.error("[main] Error during server startup sequence (after env var check):", error); // Log Error
        process.exit(1); // Exit if startup fails
    }
}

// --- Start the Server ---
console.error("Calling main function..."); // Log Start
main(); // Execute main. Errors are handled within the function's try/catch.
