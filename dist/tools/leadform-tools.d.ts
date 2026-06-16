export declare const createLeadForm: (args: {
    pageId?: string;
    name: string;
    locale?: string;
    privacyPolicy: {
        url: string;
        link_text: string;
    };
    questions?: any[];
    contextCard?: any;
    thankYouPage?: any;
    followUpActionUrl?: string;
}) => Promise<{
    success: boolean;
    message: string;
    leadFormId?: undefined;
} | {
    success: boolean;
    leadFormId: string;
    message: string;
}>;
export declare const getLeadForms: (pageId?: string) => Promise<{
    success: boolean;
    message: string;
    pageId?: undefined;
    forms?: undefined;
} | {
    success: boolean;
    pageId: string;
    forms: any;
    message: string;
}>;
export declare const getPixels: () => Promise<{
    success: boolean;
    message: string;
    pixels?: undefined;
} | {
    success: boolean;
    pixels: any;
    message: string;
}>;
