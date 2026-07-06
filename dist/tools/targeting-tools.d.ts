export declare const searchInterests: (query: string, limit?: number) => Promise<{
    success: boolean;
    items: any;
    message: string;
} | {
    success: boolean;
    message: string;
    items?: undefined;
}>;
export declare const getInterestSuggestions: (interestNames: string[], limit?: number) => Promise<{
    success: boolean;
    items: any;
    message: string;
} | {
    success: boolean;
    message: string;
    items?: undefined;
}>;
export declare const searchBehaviors: (limit?: number) => Promise<{
    success: boolean;
    items: any;
    message: string;
} | {
    success: boolean;
    message: string;
    items?: undefined;
}>;
export declare const searchGeoLocations: (query: string, locationTypes?: string[], // country, region, city, zip, geo_market, electoral_district
countryCode?: string, limit?: number) => Promise<{
    success: boolean;
    items: any;
    message: string;
} | {
    success: boolean;
    message: string;
    items?: undefined;
}>;
export declare const estimateAudienceSize: (targeting: any, optimizationGoal?: string) => Promise<{
    success: boolean;
    estimate: {
        monthlyActiveUsersLower: any;
        monthlyActiveUsersUpper: any;
        estimateReady: any;
    };
    message: string;
} | {
    success: boolean;
    message: string;
    estimate?: undefined;
}>;
