/**
 * Vytvoří nový příspěvek na Facebook stránce.
 *
 * @param content Obsah příspěvku
 * @param link Volitelný odkaz, který bude součástí příspěvku
 * @param imagePath Volitelná cesta k obrázku, který bude součástí příspěvku
 * @returns ID vytvořeného příspěvku
 */
export declare function create_post(content: string, link?: string, imagePath?: string): Promise<string>;
/**
 * Nahraje VIDEO jako organický příspěvek na Facebook stránku přes resumable upload
 * na /{page-id}/videos s page tokenem. Výchozí published=false → video se nahraje jako
 * NEPUBLIKOVANÉ (k ruční kontrole a publikaci ve Business Suite / na stránce).
 */
export declare function create_video_post(filePath: string, content: string, published?: boolean): Promise<{
    videoId: string;
    published: boolean;
}>;
