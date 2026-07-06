export declare const createPixel: (name: string) => Promise<{
    success: boolean;
    pixelId: any;
    message: string;
} | {
    success: boolean;
    message: string;
    pixelId?: undefined;
}>;
export declare const updatePixel: (pixelId: string, name: string) => Promise<{
    success: boolean;
    message: string;
    pixelId?: undefined;
} | {
    success: boolean;
    pixelId: string;
    message: string;
}>;
export declare const getPixel: (pixelId: string) => Promise<{
    success: boolean;
    pixel: {
        id: any;
        name: any;
        creationTime: any;
        lastFiredTime: any;
        isUnavailable: any;
        dataUseSetting: any;
    };
    message: string;
} | {
    success: boolean;
    message: string;
    pixel?: undefined;
}>;
export declare const getPixelStats: (pixelId: string, aggregation?: string) => Promise<{
    success: boolean;
    aggregation: string;
    stats: {
        key: string;
        count: number;
    }[];
    message: string;
} | {
    success: boolean;
    message: string;
    aggregation?: undefined;
    stats?: undefined;
}>;
