import type { Logger } from '../logging/simpleLogger';
import type { DB } from '../networking/dbConn';

/**
 * @author GustavBW
 * @since 0.0.1
 */
export type Error = string;
export type ResErr<T> = { result: T; error: null } | { result: null; error: Error };

/**
 * @author GustavBW
 * @since 0.0.1
 */
export type CLIFunc<T> = {
    func: (args: string[], context: ApplicationContext) => Promise<ResErr<T>>;
    whatToDoWithResult: (result: T) => void;
    identifier: string;
    abstractExample: string;
    documentation: string;
};

export type ApplicationContext = {
    logger: Logger;
    db: DB;
};

/**
 * @author GustavBW
 * @since 0.0.2
 */
export enum ImageMIMEType {
    JPEG = 'image/jpeg',
    JPG = 'image/jpg',
    AVIF = 'image/avif',
    TIFF = 'image/tiff',
    WEBP = 'image/webp',
    PNG = 'image/png',
    GIF = 'image/gif',
    BMP = 'image/bmp',
    SVG = 'image/svg+xml',
}
/**
 * @author GustavBW
 * @since 0.0.2
 */
export enum ImageFileType {
    JPEG = 'jpeg',
    JPG = 'jpg',
    AVIF = 'avif',
    TIFF = 'tiff',
    WEBP = 'webp',
    PNG = 'png',
    GIF = 'gif',
    BMP = 'bmp',
    SVG = 'svg',
}
/**
 * All possible image format types, even some not supported.
 * Index 0 of all field values is the MIME type.
 * @auther GustavBW
 * @since 0.0.1
 */
export const IMAGE_TYPES: { [key: string]: [ImageMIMEType, ...(ImageMIMEType | ImageFileType)[]] } = {
    jpeg: [ImageMIMEType.JPEG, ImageMIMEType.JPG, ImageFileType.JPEG, ImageFileType.JPG],
    avif: [ImageMIMEType.AVIF, ImageFileType.AVIF],
    tiff: [ImageMIMEType.TIFF, ImageFileType.TIFF, ImageFileType.TIFF],
    webp: [ImageMIMEType.WEBP, ImageFileType.WEBP],
    png: [ImageMIMEType.PNG, ImageFileType.PNG],
    gif: [ImageMIMEType.GIF, ImageFileType.GIF],
    bmp: [ImageMIMEType.BMP, ImageFileType.BMP],
    svg: [ImageMIMEType.SVG, ImageFileType.SVG],
};
