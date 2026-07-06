export declare const uploadAdMedia: (filePath: string, description?: string) => Promise<{
    success: boolean;
    type: string;
    imageHash: any;
    id: any;
    message: string;
    videoId?: undefined;
} | {
    success: boolean;
    type: string;
    videoId: string;
    message: string;
    imageHash?: undefined;
    id?: undefined;
} | {
    success: boolean;
    message: string;
    type?: undefined;
    imageHash?: undefined;
    id?: undefined;
    videoId?: undefined;
}>;
export declare const createAdCreative: (name: string, objectStorySpec: any) => Promise<{
    success: boolean;
    creativeId: any;
    message: string;
} | {
    success: boolean;
    message: string;
    creativeId?: undefined;
}>;
export declare const updateAdCreative: (creativeId: string, updates: {
    name?: string;
    status?: string;
}) => Promise<{
    success: boolean;
    message: string;
    creativeId?: undefined;
} | {
    success: boolean;
    creativeId: string;
    message: string;
}>;
export declare const createAd: (adsetId: string, name: string, creativeId: string, status?: string) => Promise<{
    success: boolean;
    adId: any;
    status: string;
    message: string;
} | {
    success: boolean;
    message: string;
    adId?: undefined;
    status?: undefined;
}>;
export declare const updateAd: (adId: string, updates: {
    name?: string;
    status?: string;
    creativeId?: string;
}) => Promise<{
    success: boolean;
    message: string;
    adId?: undefined;
} | {
    success: boolean;
    adId: string;
    message: string;
}>;
export declare const getAd: (adId: string) => Promise<{
    success: boolean;
    message: string;
    ad?: undefined;
} | {
    success: boolean;
    ad: {
        id: any;
        name: any;
        status: any;
        effectiveStatus: any;
        adSetId: any;
        campaignId: any;
        creativeId: any;
        creativeName: any;
        link: any;
        ctaType: any;
        ctaLink: any;
        leadFormId: any;
        message: any;
        title: any;
        videoId: any;
        imageHash: any;
        thumbnailUrl: any;
        effectiveObjectStoryId: any;
    };
    message?: undefined;
}>;
export declare const deleteAd: (adId: string) => Promise<{
    success: boolean;
    adId: string;
    message: string;
} | {
    success: boolean;
    message: string;
    adId?: undefined;
}>;
