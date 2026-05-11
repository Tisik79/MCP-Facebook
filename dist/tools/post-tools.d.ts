/**
 * Vytvoří nový příspěvek na Facebook stránce.
 *
 * @param content Obsah příspěvku
 * @param link Volitelný odkaz, který bude součástí příspěvku
 * @param imagePath Volitelná cesta k obrázku, který bude součástí příspěvku
 * @returns ID vytvořeného příspěvku
 */
export declare function create_post(content: string, link?: string, imagePath?: string): Promise<string>;
