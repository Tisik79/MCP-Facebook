export declare const createCustomAudience: (name: string, description: string, customerFileSource: string, subtype?: string) => Promise<{
    success: boolean;
    audienceId: string;
    audienceData: {
        id: string;
        name: any;
        description: any;
        subtype: any;
        approximateCount: any;
    };
    message: string;
} | {
    success: boolean;
    message: string;
    audienceId?: undefined;
    audienceData?: undefined;
}>;
export declare const getCustomAudiences: (limit?: number) => Promise<{
    success: boolean;
    audiences: {
        id: any;
        name: any;
        description: any;
        subtype: any;
        approximateCount: any;
    }[];
    message?: undefined;
} | {
    success: boolean;
    message: string;
    audiences?: undefined;
}>;
export declare const getCustomAudienceDetails: (audienceId: string) => Promise<{
    success: boolean;
    audience: {
        id: string;
        name: any;
        description: any;
        subtype: any;
        approximateCount: any;
        timeCreated: any;
        timeUpdated: any;
        customerFileSource: any;
        dataSource: any;
        rule: any;
        operationStatus: any;
        permissionForActions: any;
    };
    message?: undefined;
} | {
    success: boolean;
    message: string;
    audience?: undefined;
}>;
export declare const updateCustomAudience: (audienceId: string, name?: string, description?: string) => Promise<{
    success: boolean;
    message: string;
}>;
export declare const deleteCustomAudience: (audienceId: string) => Promise<{
    success: boolean;
    message: string;
}>;
export declare const createLookalikeAudience: (sourceAudienceId: string, name: string, description: string, country: string, ratio?: number) => Promise<{
    success: boolean;
    message: string;
    audienceId?: undefined;
    audienceData?: undefined;
} | {
    success: boolean;
    audienceId: string;
    audienceData: {
        id: string;
        name: any;
        description: any;
        subtype: any;
        approximateCount: any;
    };
    message: string;
}>;
export declare const addUsersToCustomAudience: (audienceId: string, users: Array<{
    schema: string;
    data: string[];
}>, type?: string) => Promise<{
    success: boolean;
    message: string;
}>;
