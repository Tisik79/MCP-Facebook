export declare const sendConversionEvent: (args: {
    pixelId: string;
    eventName: string;
    eventTime?: number;
    eventId?: string;
    userData: any;
    customData?: any;
    eventSourceUrl?: string;
    actionSource?: string;
    testEventCode?: string;
}) => Promise<{
    success: boolean;
    eventsReceived: any;
    fbtraceId: any;
    message: string;
} | {
    success: boolean;
    message: string;
    eventsReceived?: undefined;
    fbtraceId?: undefined;
}>;
export declare const sendConversionEventsBatch: (pixelId: string, events: any, testEventCode?: string) => Promise<{
    success: boolean;
    eventsReceived: any;
    message: string;
} | {
    success: boolean;
    message: string;
    eventsReceived?: undefined;
}>;
export declare const listCustomConversions: () => Promise<{
    success: boolean;
    items: any;
    message: string;
} | {
    success: boolean;
    message: string;
    items?: undefined;
}>;
export declare const getCustomConversion: (id: string) => Promise<{
    success: boolean;
    conversion: {
        id: any;
        name: any;
        eventType: any;
        rule: any;
        pixelId: any;
        archived: any;
        defaultValue: any;
        creationTime: any;
    };
    message: string;
} | {
    success: boolean;
    message: string;
    conversion?: undefined;
}>;
export declare const createCustomConversion: (args: {
    name: string;
    pixelId: string;
    customEventType?: string;
    rule?: any;
    defaultConversionValue?: number;
}) => Promise<{
    success: boolean;
    conversionId: any;
    message: string;
} | {
    success: boolean;
    message: string;
    conversionId?: undefined;
}>;
export declare const updateCustomConversion: (id: string, updates: {
    name?: string;
    defaultConversionValue?: number;
}) => Promise<{
    success: boolean;
    message: string;
}>;
export declare const deleteCustomConversion: (id: string) => Promise<{
    success: boolean;
    message: string;
}>;
export declare const listOfflineConversionSets: () => Promise<{
    success: boolean;
    items: any;
    message: string;
} | {
    success: boolean;
    message: string;
    items?: undefined;
}>;
export declare const createOfflineConversionSet: (name: string, description?: string, businessId?: string) => Promise<{
    success: boolean;
    setId: any;
    message: string;
} | {
    success: boolean;
    message: string;
    setId?: undefined;
}>;
export declare const uploadOfflineConversions: (setId: string, uploadTag: string, data: any) => Promise<{
    success: boolean;
    apiCallsMade: any;
    message: string;
} | {
    success: boolean;
    message: string;
    apiCallsMade?: undefined;
}>;
