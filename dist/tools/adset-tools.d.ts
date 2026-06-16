export declare const createAdSet: (campaignId: string, name: string, status: string, targeting: any, // Targeting spec can be complex, using 'any' for now
optimizationGoal: string, billingEvent: string, bidAmount?: number, // Optional bid amount in cents
dailyBudget?: number, // Optional daily budget in cents
lifetimeBudget?: number, // Optional lifetime budget in cents
startTime?: string, endTime?: string, promotedObject?: any, // Optional promoted_object (lead kampaně: pixel_id/custom_event_type nebo page_id)
destinationType?: string, // Optional destination_type (WEBSITE, ON_AD, MESSENGER, PHONE_CALL, INSTAGRAM_DIRECT)
dsaBeneficiary?: string, // EU DSA: kdo z reklamy těží (povinné u cílení na EU)
dsaPayor?: string) => Promise<{
    success: boolean;
    adSetId: string;
    adSetData: {
        id: string;
        name: any;
        status: any;
        optimizationGoal: any;
        billingEvent: any;
        dailyBudget: number | null;
        lifetimeBudget: number | null;
        startTime: any;
        endTime: any;
        promotedObject: any;
        destinationType: any;
    };
    message: string;
} | {
    success: boolean;
    message: string;
    adSetId?: undefined;
    adSetData?: undefined;
}>;
export declare const updateAdSet: (adSetId: string, updates: {
    name?: string;
    status?: string;
}) => Promise<{
    success: boolean;
    message: string;
    adSetId?: undefined;
    status?: undefined;
} | {
    success: boolean;
    adSetId: string;
    message: string;
    status?: undefined;
} | {
    success: boolean;
    adSetId: string;
    status: any;
    message: string;
}>;
