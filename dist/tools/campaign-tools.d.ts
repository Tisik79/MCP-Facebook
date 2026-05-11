export declare const createCampaign: (name: string, objective: string, status: string, dailyBudget?: number, startTime?: string, endTime?: string, special_ad_categories?: string[]) => Promise<{
    success: boolean;
    campaignId: string;
    campaignData: {
        id: string;
        name: any;
        objective: any;
        status: any;
        createdTime: any;
        dailyBudget: number | null;
    };
    message: string;
} | {
    success: boolean;
    message: string;
    campaignId?: undefined;
    campaignData?: undefined;
}>;
export declare const getCampaigns: (limit?: number, status?: string) => Promise<{
    success: boolean;
    campaigns: {
        id: any;
        name: any;
        objective: any;
        status: any;
        createdTime: any;
        dailyBudget: number | null;
    }[];
    message?: undefined;
} | {
    success: boolean;
    message: string;
    campaigns?: undefined;
}>;
export declare const updateCampaign: (campaignId: string, name?: string, status?: string, dailyBudget?: number, endTime?: string) => Promise<{
    success: boolean;
    message: string;
}>;
export declare const getCampaignDetails: (campaignId: string) => Promise<{
    success: boolean;
    campaign: {
        id: string;
        name: any;
        objective: any;
        status: any;
        createdTime: any;
        startTime: any;
        stopTime: any;
        dailyBudget: number | null;
        lifetimeBudget: number | null;
        spendCap: number | null;
        budgetRemaining: number | null;
        buyingType: any;
        specialAdCategories: any;
    };
    message?: undefined;
} | {
    success: boolean;
    message: string;
    campaign?: undefined;
}>;
export declare const deleteCampaign: (campaignId: string) => Promise<{
    success: boolean;
    message: string;
}>;
