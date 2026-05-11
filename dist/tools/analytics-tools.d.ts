export declare const getCampaignInsights: (campaignId: string, timeRange?: {
    since: string;
    until: string;
}, metrics?: string[]) => Promise<{
    success: boolean;
    message: string;
    insights: null;
} | {
    success: boolean;
    insights: any[];
    message?: undefined;
} | {
    success: boolean;
    message: string;
    insights?: undefined;
}>;
export declare const getAccountInsights: (timeRange?: {
    since: string;
    until: string;
}, metrics?: string[], groupBy?: string) => Promise<{
    success: boolean;
    message: string;
    insights: null;
} | {
    success: boolean;
    insights: any[];
    message?: undefined;
} | {
    success: boolean;
    message: string;
    insights?: undefined;
}>;
export declare const compareCampaigns: (campaignIds: string[], timeRange?: {
    since: string;
    until: string;
}, metrics?: string[]) => Promise<{
    success: boolean;
    message: string;
    campaigns?: undefined;
} | {
    success: boolean;
    campaigns: {
        id: string;
        name: any;
        insights: any;
    }[];
    message?: undefined;
}>;
export declare const getCampaignDemographics: (campaignId: string, timeRange?: {
    since: string;
    until: string;
}) => Promise<{
    success: boolean;
    message: string;
    demographics: null;
} | {
    success: boolean;
    demographics: any;
    message?: undefined;
} | {
    success: boolean;
    message: string;
    demographics?: undefined;
}>;
export declare const getAdSetInsights: (adSetId: string, timeRange?: {
    since: string;
    until: string;
}, metrics?: string[]) => Promise<{
    success: boolean;
    message: string;
    insights: null;
} | {
    success: boolean;
    insights: any[];
    message?: undefined;
} | {
    success: boolean;
    message: string;
    insights?: undefined;
}>;
export declare const getAdInsights: (adId: string, timeRange?: {
    since: string;
    until: string;
}, metrics?: string[]) => Promise<{
    success: boolean;
    message: string;
    insights: null;
} | {
    success: boolean;
    insights: any[];
    message?: undefined;
} | {
    success: boolean;
    message: string;
    insights?: undefined;
}>;
export declare const getAdSets: (campaignId?: string, limit?: number, status?: string) => Promise<{
    success: boolean;
    adSets: {
        id: any;
        name: any;
        status: any;
        effectiveStatus: any;
        campaignId: any;
        dailyBudget: number | null;
        lifetimeBudget: number | null;
        optimizationGoal: any;
        billingEvent: any;
        startTime: any;
        endTime: any;
    }[];
    message?: undefined;
} | {
    success: boolean;
    message: string;
    adSets?: undefined;
}>;
export declare const getAds: (adSetId?: string, campaignId?: string, limit?: number, status?: string) => Promise<{
    success: boolean;
    ads: {
        id: any;
        name: any;
        status: any;
        effectiveStatus: any;
        adSetId: any;
        campaignId: any;
        creativeId: any;
        createdTime: any;
        updatedTime: any;
    }[];
    message?: undefined;
} | {
    success: boolean;
    message: string;
    ads?: undefined;
}>;
