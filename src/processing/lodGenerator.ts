import sharp from 'sharp';
import { ImageFileType, ImageMIMEType, type ApplicationContext, type ResErr } from '../ts/metaTypes.ts';
import type { LODDTO } from '../ts/types.ts';
import { checkIfImageTypeIsSupported } from './imageUtil.ts';
import { LogLevel } from '../logging/simpleLogger.ts';
import { findConformingMIMEType } from './typeChecker.ts';


/**
 * @author GustavBW
 * @since 0.0.1
 * @param blob image
 * @param sizeThreshold in kilobytes 
 * @returns 
 */
export async function generateLODs(blob: Blob, sizeThreshold: number, context?: ApplicationContext, typeOverwrite?: ImageMIMEType): Promise<ResErr<LODDTO[]>> {
    let blobType: ImageMIMEType;
    if(typeOverwrite) {
        blobType = typeOverwrite;
    } else {
        const {result, error} = findConformingMIMEType(blob.type); if (error !== null) { 
            return {result: null, error: error}; 
        }
        blobType = result;
    }

    if(!checkIfImageTypeIsSupported(blobType)) {
        context?.logger.log("[lod gen] Unsupported blob type: " + blob.type, LogLevel.ERROR);
        return {result: null, error: `Unsupported image type: ${blob.type}`};
    }
    if(blob.size == 0) { // Empty blob detected
        context?.logger.log("[lod gen] Empty blob detected.", LogLevel.ERROR);
        return {result: null, error: "This blob is empty."};
    }
    if(blobType === ImageMIMEType.SVG) { // No sense in LOD'ifying svgs
        context?.logger.log("[lod gen] SVG detected, no LODs needed.");
        return {result: [{detailLevel: 0, blob: blob, type: blobType}], error: null};
    }
    const lodsGenerated: LODDTO[] = [{detailLevel: 0, blob: blob, type: blobType}];
    if(blob.size / 1000 < sizeThreshold) { // Already below threshold
        context?.logger.log("[lod gen] Image already below threshold, size: " + blob.size / 1000 + "KB");
        return {result: lodsGenerated, error: null};
    }
    let currentBlob = blob;
    let detailLevel = 1;
    while (currentBlob.size / 1000 > sizeThreshold) {
        context?.logger.log("[lod gen] Generating detail level: " + detailLevel);
        const {result, error} = await downscaleImage(currentBlob, context);
        if (error !== null) {
            context?.logger.log("[lod gen] Downscaling failed: " + error, LogLevel.ERROR);
            return {result: null, error: error};
        }
        lodsGenerated.push({detailLevel: detailLevel, blob: result, type: blobType});
        currentBlob = result;
        detailLevel++;
    }
    return {result: lodsGenerated, error: null};
}

const formatInstanceToType = (instance: sharp.Sharp, type: string): ResErr<sharp.Sharp> => {
    let formattedInstance;
    switch (type) {
        case ImageMIMEType.JPEG:
        case ImageFileType.JPEG:
        case ImageFileType.JPG: formattedInstance = instance.jpeg({quality: 100}); break;
        case ImageMIMEType.PNG:
        case ImageFileType.PNG: formattedInstance = instance.png({compressionLevel: 9}); break;
        case ImageMIMEType.WEBP:
        case ImageFileType.WEBP: formattedInstance = instance.webp({lossless: true}); break;
        case ImageMIMEType.GIF:
        case ImageFileType.GIF: formattedInstance = instance.gif(); break;
        case ImageMIMEType.TIFF:
        case ImageFileType.TIFF: formattedInstance = instance.tiff({quality: 100}); break;
        default: return {result: null, error: "Unsupported image type: " + type};
    }
    return {result: formattedInstance, error: null};
}
/**
 * Halves the resultion of the image in both dimensions
 * @author GustavBW
 * @since 0.0.1
 */
export async function downscaleImage(blob: Blob, context?: ApplicationContext): Promise<ResErr<Blob>> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const image = sharp(Buffer.from(arrayBuffer), { failOn: "error"});
      const metadata = await image.metadata();

      const width = Math.floor(metadata.width! / 2);
      const height = Math.floor(metadata.height! / 2);
      context?.logger.log(`[lod gen] Downscaling to width: ${width}, height: ${height}`);

      const resized = image.resize(width, height);
      const {result, error} = formatInstanceToType(resized, metadata.format!);
        if (error !== null) {
            return {result: null, error: error};
        }

      const outputBuffer = await result.toBuffer();
      const outputBlob = new Blob([outputBuffer], { type: blob.type });
      return { result: outputBlob, error: null };
    } catch (error) {
      return { result: null, error: (error as any).message };
    }
  }
  