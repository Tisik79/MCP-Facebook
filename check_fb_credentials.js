// Script to check Facebook API credentials using the facebook-nodejs-business-sdk
// The SDK handles making the necessary HTTP GET requests to the Facebook Graph API.
console.log("--- Script Start ---"); // Log script start

// --- Credentials from Environment Variables ---
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.FACEBOOK_ACCOUNT_ID;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET; // Optional, not directly tested by this script's API call
const APP_ID = process.env.FACEBOOK_APP_ID;         // Optional, not directly tested by this script's API call

async function checkCredentials(sdk) {
    const { FacebookAdsApi, AdAccount } = sdk; // Destructure SDK components
    console.log("--- Running checkCredentials function ---");
    console.log("Attempting to validate ACCESS_TOKEN and AD_ACCOUNT_ID by fetching account details.");

    // Log provided credentials again inside the function to be sure
    console.log(`Inside checkCredentials - ACCESS_TOKEN: ${ACCESS_TOKEN ? 'Provided' : 'Missing'}`);
    console.log(`Inside checkCredentials - AD_ACCOUNT_ID: ${AD_ACCOUNT_ID || 'Missing'}`);
    console.log(`Inside checkCredentials - APP_ID: ${APP_ID || 'Not Provided'}`);
    console.log(`Inside checkCredentials - APP_SECRET: ${APP_SECRET ? 'Provided' : 'Not Provided'}`);
    console.log("---------------------------------------------");

    if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
        console.error("\nError: FACEBOOK_ACCESS_TOKEN and FACEBOOK_ACCOUNT_ID environment variables are required.");
        process.exitCode = 1; // Set exit code instead of immediate exit
        return; // Stop execution of this function
    }

    // Ensure the Ad Account ID has the 'act_' prefix
    const formattedAccountId = AD_ACCOUNT_ID.startsWith('act_') ? AD_ACCOUNT_ID : `act_${AD_ACCOUNT_ID}`;
    console.log(`Using formatted Ad Account ID: ${formattedAccountId}`);


    try {
        console.log("\nInitializing Facebook API with Access Token...");
        const api = FacebookAdsApi.init(ACCESS_TOKEN);
        console.log("API Initialized.");
        // Optional: Enable debug logging for SDK requests
        // api.setDebug(true);

        console.log(`Attempting to create AdAccount object for ID: ${formattedAccountId}...`);
        const account = new AdAccount(formattedAccountId); // Use formatted ID
        console.log("AdAccount object created.");

        console.log("Attempting to read account fields...");
        // Request basic fields for the ad account to verify token and ID validity
        // This implicitly makes a GET request like: GET /vX.X/act_{AD_ACCOUNT_ID}?fields=name,account_status,currency&access_token=...
        const fieldsToFetch = ['name', 'account_status', 'currency'];
        const accountDetails = await account.read(fieldsToFetch);
        console.log("Account fields read successfully.");

        console.log("\n✅ --- Credentials Check Successful --- ✅");
        console.log("Successfully fetched Ad Account details using the provided Access Token and Ad Account ID:");
        console.log(`   - Account Name: ${accountDetails.name}`);
        console.log(`   - Account Status: ${accountDetails.account_status}`);
        console.log(`   - Currency: ${accountDetails.currency}`);
        console.log("\nConclusion: Your FACEBOOK_ACCESS_TOKEN is valid and has permissions to read details for FACEBOOK_ACCOUNT_ID.");

    } catch (error) {
        console.error("\n❌ --- Credentials Check Failed within try block --- ❌");
        console.error("   An error occurred while trying to access the Facebook API via the SDK:");

        if (error.response) {
            // Log detailed error from Facebook API response if available
            console.error("   API Error Response:", JSON.stringify(error.response.data || error.response, null, 2));
        } else {
            // Log general error message if no specific API response
            console.error("   Error Message:", error.message);
            console.error("   Stack Trace:", error.stack); // Log stack trace for better debugging
        }
        console.error("\n   Troubleshooting Tips:");
        console.error("   1. Double-check your FACEBOOK_ACCESS_TOKEN and FACEBOOK_ACCOUNT_ID environment variables.");
        console.error("   2. Ensure the Access Token is not expired.");
        console.error("   3. Verify the Access Token has the necessary permissions (e.g., 'ads_read').");
        console.error("   4. Check if the Ad Account ID is correct and accessible by the token's user.");
        process.exitCode = 1; // Set exit code
    } finally {
        console.log("--- checkCredentials function finished ---");
    }
}

// Main execution block with enhanced error handling
async function main() {
    console.log("--- Starting main execution block ---");
    try {
        console.log("Attempting dynamic import of 'facebook-nodejs-business-sdk'...");
        const sdk = await import('facebook-nodejs-business-sdk');
        console.log("SDK imported successfully.");
        await checkCredentials(sdk); // Pass the imported SDK module
    } catch (error) {
        console.error("❌ --- Top-Level Error Caught --- ❌");
        console.error("   An error occurred outside the checkCredentials function (e.g., during import):");
        console.error("   Error Message:", error.message);
        console.error("   Stack Trace:", error.stack);
        if (error.message.includes('facebook-nodejs-business-sdk')) {
             console.error("   Hint: Ensure the package is installed correctly: run 'npm install facebook-nodejs-business-sdk'");
        }
        process.exitCode = 1; // Set exit code
    } finally {
        console.log("--- Script End ---");
        // process.exit() is implicitly called with process.exitCode when the script finishes
    }
}

main(); // Run the main function
