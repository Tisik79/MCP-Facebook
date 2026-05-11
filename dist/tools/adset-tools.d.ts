export declare const createAdSet: (campaignId: string, name: string, status: string, targeting: any, // Targeting spec can be complex, using 'any' for now
optimizationGoal: string, billingEvent: string, bidAmount?: number, // Optional bid amount in cents
dailyBudget?: number, // Optional daily budget in cents
lifetimeBudget?: number, // Optional lifetime budget in cents
startTime?: string, endTime?: string) => Promise<{
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
    };
    message: string;
} | {
    success: boolean;
    message: string;
    adSetId?: undefined;
    adSetData?: undefined;
}>;
