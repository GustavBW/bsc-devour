import sharp from 'sharp';
import type { ApplicationContext, ResErr } from '../ts/metaTypes.ts';
import type { LODDTO } from '../ts/types.ts';
import { checkIfImageTypeIsSupported } from './imageUtil.ts';
import { LogLevel } from '../logging/simpleLogger.ts';


/**
 * @author GustavBW
 * @since 0.0.1
 * @param blob image
 * @param sizeThreshold in kilobytes 
 * @returns 
 */
export async function generateLODs(blob: Blob, sizeThreshold: number, context?: ApplicationContext): Promise<ResErr<LODDTO[]>> {
    if(!checkIfImageTypeIsSupported(blob.type.toLowerCase())) {
        context?.logger.log("[LODG] Unsupported blob type: " + blob.type, LogLevel.ERROR);
        return {result: null, error: `Unsupported image type: ${blob.type}`};
    }
    if(blob.size == 0) { // Empty blob detected
        context?.logger.log("[LODG] Empty blob detected.", LogLevel.ERROR);
        return {result: null, error: "This blob is empty."};
    }
    if(blob.type.toLowerCase() === "image/svg+xml") { // No sense in LOD'ifying svgs
        context?.logger.log("[LODG] SVG detected, no LODs needed.");
        return {result: [{detailLevel: 0, blob: blob}], error: null};
    }
    const lodsGenerated: LODDTO[] = [{detailLevel: 0, blob: blob}];
    if(blob.size / 1000 < sizeThreshold) { // Already below threshold
        context?.logger.log("[LODG] Image already below threshold, size: " + blob.size / 1000 + "KB");
        return {result: lodsGenerated, error: null};
    }
    let currentBlob = blob;
    let detailLevel = 1;
    while (currentBlob.size / 1000 > sizeThreshold) {
        context?.logger.log("[LODG] Generating detail level: " + detailLevel);
        const {result, error} = await downscaleImage(currentBlob);
        if (error !== null) {
            context?.logger.log("[LODG] Downscaling failed: " + error, LogLevel.ERROR);
            return {result: null, error: error};
        }
        lodsGenerated.push({detailLevel: detailLevel, blob: result});
        currentBlob = result;
        detailLevel++;
    }
    return {result: lodsGenerated, error: null};
}

const formatInstanceToType = (instance: sharp.Sharp, type: string): ResErr<sharp.Sharp> => {
    let formattedInstance;
    switch (type) {
        case "image/jpeg":
        case "jpeg":
        case "jpg": formattedInstance = instance.jpeg({quality: 100}); break;
        case "image/png":
        case "png": formattedInstance = instance.png({compressionLevel: 9}); break;
        case "image/webp":
        case "webp": formattedInstance = instance.webp({lossless: true}); break;
        case "image/gif":
        case "gif": formattedInstance = instance.gif(); break;
        case "image/tiff":
        case "tiff": formattedInstance = instance.tiff({quality: 100}); break;
        default: return {result: null, error: "Unsupported image type: " + type};
    }
    return {result: formattedInstance, error: null};
}

export async function downscaleImage(blob: Blob, context?: ApplicationContext): Promise<ResErr<Blob>> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const image = sharp(Buffer.from(arrayBuffer), { failOn: "error"});
      const metadata = await image.metadata();

      const width = Math.floor(metadata.width! / 2);
      const height = Math.floor(metadata.height! / 2);
      context?.logger.log(`[LODG] Downscaling to width: ${width}, height: ${height}`);

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
  