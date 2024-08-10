import sharp from "sharp";
import type { ApplicationContext, ResErr } from "../ts/metaTypes";
import { findConformingMIMEType } from "./typeChecker";

const supportedImageTypes = ["IMAGE/JPEG", "IMAGE/PNG", "IMAGE/WEBP", "IMAGE/GIF", "IMAGE/TIFF", "IMAGE/SVG+XML"].map(k => k.toLowerCase());

export const checkIfImageTypeIsSupported = (type: string): boolean => {
    return supportedImageTypes.includes(type.toLowerCase());
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
    const findTypeRes = findConformingMIMEType(blob.type);
    if (findTypeRes.error !== null || !checkIfImageTypeIsSupported(findTypeRes.result!)) {
        return {result: null, error: `Unsupported image type: ${blob.type}`};
    }
    const data = await blob.arrayBuffer();
    try{
        const metadata = await sharp(data).metadata();
        return {result: metadata, error: null};
    }catch(e){
        return {result: null, error: (e as any).message};
    }
}