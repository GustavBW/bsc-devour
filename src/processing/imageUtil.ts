import sharp from "sharp";
import { ImageMIMEType, type ApplicationContext, type ResErr } from "../ts/metaTypes";
import { findConformingMIMEType } from "./typeChecker";

export const SUPPORTED_IMAGE_TYPES = {
    JPEG: ImageMIMEType.JPEG,
    PNG: ImageMIMEType.PNG,
    WEBP: ImageMIMEType.WEBP,
    GIF: ImageMIMEType.GIF,
    TIFF: ImageMIMEType.TIFF,
    SVG: ImageMIMEType.SVG
}
const supportedTypesLowerCased = Object.values(SUPPORTED_IMAGE_TYPES).map((type) => type.toLowerCase());

export const checkIfImageTypeIsSupported = (type: string): boolean => {
    return supportedTypesLowerCased.includes(type.toLowerCase());
}
/**
 * NB: For svgs, width and height relates to the viewport properties. Not pixels.
 * @since 0.0.1
 * @author GustavBW
 * @param blob 
 * @param context 
 * @returns 
 */
export const getMetaDataAsIfImage = async (blob: Blob, context?: ApplicationContext): Promise<ResErr<sharp.Metadata>> => {
    context?.logger.log(`[img_util] Getting metadata as if image of: ${blob.type}`);
    const findTypeRes = findConformingMIMEType(blob.type);
    if (findTypeRes.error !== null || !checkIfImageTypeIsSupported(findTypeRes.result!)) {
        context?.logger.log(`[img_util] GUnsupported image type: ${blob.type}`);
        return {result: null, error: `Unsupported image type: ${blob.type}`};
    }
    const data = await blob.arrayBuffer();
    try{
        const metadata = await sharp(data).metadata();
        return {result: metadata, error: null};
    }catch(e){
        context?.logger.log(`[img_util] GError getting metadata: ${e}`);
        return {result: null, error: (e as any).message};
    }
}