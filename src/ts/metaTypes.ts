import type { Logger } from "../logging/simpleLogger";

/**
 * @author GustavBW
 * @since 0.0.1
 */
export type Error = string;
export type ResErr<T> = | { result: T; error: null } | { result: null; error: Error };

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
}

export type ApplicationContext = {
    logger: Logger,
}


export enum Type {
    STRING = "string",
    FLOAT = "float",
    INTEGER = "integer",
    BOOLEAN = "boolean",
    OBJECT = "object",
    ARRAY = "array"
}
export type FieldValidatorFunction = (valueOfField: any) => boolean;
export type TypeDeclaration = {
    [key: string]: Type | FieldValidatorFunction
}

export type ImageMIMEType = "image/jpeg" | "image/jpg" | "image/avif" | "image/tiff" | "image/webp" | "image/png" | "image/gif" | "image/bmp" | "image/svg+xml";
export type ImageFileType = "jpeg" | "jpg" | "avif" | "tiff" | "tif" | "webp" | "png" | "gif" | "bmp" | "svg";
/**
 * All possible image format types, even some not supported. 
 * Index 0 of all field values is the MIME type.
 */
export const IMAGE_TYPES: {[key: string]: [ImageMIMEType, ...(ImageMIMEType | ImageFileType)[]]} = {
    jpeg: ["image/jpeg", "image/jpg", "jpeg", "jpg"], 
    avif: ["image/avif", "avif"], 
    tiff: ["image/tiff", "tiff", "tif"], 
    webp: ["image/webp", "webp"], 
    png: ["image/png", "png"], 
    gif: ["image/gif", "gif"], 
    bmp: ["image/bmp", "bmp"], 
    svg: ["image/svg+xml", "svg"],
}