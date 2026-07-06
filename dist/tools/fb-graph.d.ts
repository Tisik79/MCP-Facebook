export declare const GRAPH_VERSION: string;
export declare const requireToken: () => string;
export declare const requireActId: () => string;
export declare const graphGet: (path: string, params?: Record<string, string>) => Promise<any>;
export declare const graphPost: (path: string, params?: Record<string, string>) => Promise<any>;
export declare const graphDelete: (path: string, params?: Record<string, string>) => Promise<any>;
export declare const parseIfString: (v: any, label: string) => any;
