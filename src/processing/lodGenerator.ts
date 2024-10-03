import sharp from 'sharp';
import { ImageFileType, ImageMIMEType, type ApplicationContext, type ResErr } from '../ts/metaTypes.ts';
import type { LODDTO } from '../ts/types.ts';
import { checkIfImageTypeIsSupported } from './imageUtil.ts';
import { LogLevel } from '../logging/simpleLogger.ts';
import { findConformingMIMEType } from '../runtimeTypeChecker/type.ts';
import { computeETag } from './etag.ts';
import { joinOmitSeperatorOnLast } from '../runtimeTypeChecker/arrayUtil.ts';

type LODGenSpec = {
    detailLevel: number;
    base: ArrayBuffer;
    scalar: number;
}

/**
 * @author GustavBW
 * @since 0.0.1
 * @param baseBlob image
 * @param sizeThreshold in kilobytes
 * @returns an undordered array of downscaled versions of the input image. Including the original image.
 */
export async function generateLODs(
    baseBlob: Blob,
    sizeThreshold: number,
    context?: ApplicationContext,
    typeOverwrite?: ImageMIMEType,
): Promise<ResErr<LODDTO[]>> {
    if (sizeThreshold <= 0) {
        context?.logger.log('[lod_gen] Invalid size threshold: ' + sizeThreshold, LogLevel.ERROR);
        return { result: null, error: 'Invalid size threshold: ' + sizeThreshold };
    }

    let blobType: ImageMIMEType;
    if (typeOverwrite) {
        blobType = typeOverwrite;
    } else {
        const { result, error } = findConformingMIMEType(baseBlob.type);
        if (error !== null) {
            return { result: null, error: error };
        }
        blobType = result;
    }

    if (!checkIfImageTypeIsSupported(blobType)) {
        context?.logger.log('[lod_gen] Unsupported blob type: ' + baseBlob.type, LogLevel.ERROR);
        return { result: null, error: `Unsupported image type: ${baseBlob.type}` };
    }
    const blobSizeInKB = baseBlob.size / 1000;
    if (blobSizeInKB <= 0) {
        // Empty blob detected
        context?.logger.log('[lod_gen] Empty blob detected.', LogLevel.ERROR);
        return { result: null, error: 'This blob is empty.' };
    }
    const etagOfLOD0Attempt = await computeETag(baseBlob);
    if (etagOfLOD0Attempt.error !== null) {
        context?.logger.log('[lod_gen] Error computing etag for lod: ' + etagOfLOD0Attempt.error, LogLevel.ERROR);
        return { result: null, error: etagOfLOD0Attempt.error };
    }
    const lodsGenerated: LODDTO[] = [
        {
            detailLevel: 0,
            blob: baseBlob,
            type: blobType,
            etag: etagOfLOD0Attempt.result,
        },
    ];
    if (blobType === ImageMIMEType.SVG) {
        // No sense in LOD'ifying svgs
        context?.logger.log('[lod_gen] SVG detected, no LODs needed.');
        return { result: lodsGenerated, error: null };
    }
    const requiredLods = calculateRequiredLODs(blobSizeInKB, sizeThreshold);
    if (requiredLods === 0) {
        // Already below threshold
        context?.logger.log('[lod_gen] Image already below threshold, size: ' + blobSizeInKB + 'KB');
        return { result: lodsGenerated, error: null };
    }
    const baseAsBuffer = await baseBlob.arrayBuffer();
    const specs: LODGenSpec[] = []
    for (let i = 1; i <= requiredLods; i++) {
        specs.push({
            detailLevel: i,
            base: baseAsBuffer,
            scalar: calculateXYScalarForLOD(i),
        });
    }
    const results = await Promise.all(
        specs.map(async (spec) => {
            context?.logger.log('[lod_gen] Generating detail level: ' + spec.detailLevel);
            const { result, error } = await downscaleImage(spec.base, blobType, spec.scalar, spec.scalar, context);
            if (error !== null) {
                context?.logger.log('[lod_gen] Downscaling failed: ' + error, LogLevel.ERROR);
                return { result: null, error: error};
            }
            const etagAttempt = await computeETag(result);
            if (etagAttempt.error !== null) {
                context?.logger.log('[lod_gen] Error computing etag for lod: ' + etagAttempt.error, LogLevel.ERROR);
                return { result: null, error: etagAttempt.error};
            }
            return { result: {
                detailLevel: spec.detailLevel,
                blob: result,
                type: blobType,
                etag: etagAttempt.result,
            }, error: null };
        })
    );
    const errors = [];
    const lods = [];
    for (const res of results) {
        if (res.error !== null) {
            errors.push(res.error);
        }else{
            lods.push(res.result);
        }
    }

    if (errors.length > 0) {
        return { result: null, error: joinOmitSeperatorOnLast(errors, ', ') };
    }
    lodsGenerated.push(...lods);

    return { result: lodsGenerated, error: null };
}

/**
 * @param originalSize in kilobytes
 * @param threshold in kilobytes
 */
export const calculateRequiredLODs = (originalSize: number, threshold: number): number => {
    if (originalSize < threshold) {
        return 0;
    }

    // We need to find n such that: originalSize * (1/4)^n < threshold
    // Taking log base 4 of both sides: log4(originalSize) - n < log4(threshold)
    // Solving for n: n > log4(originalSize) - log4(threshold)
    // We add 1 to ensure we're strictly less than the threshold
    const n = Math.floor(Math.log(originalSize / threshold) / Math.log(4)) + 1;
    return n;
};

export const calculateXYScalarForLOD = (detailLevel: number): number => {
    return Math.pow(1/2, detailLevel);
}

const formatInstanceToType = (instance: sharp.Sharp, type: string): ResErr<sharp.Sharp> => {
    let formattedInstance;
    switch (type) {
        case ImageMIMEType.JPEG:
        case ImageFileType.JPEG:
        case ImageFileType.JPG:
            formattedInstance = instance.jpeg({ quality: 100 });
            break;
        case ImageMIMEType.PNG:
        case ImageFileType.PNG:
            formattedInstance = instance.png({ compressionLevel: 9 });
            break;
        case ImageMIMEType.WEBP:
        case ImageFileType.WEBP:
            formattedInstance = instance.webp({ lossless: true });
            break;
        case ImageMIMEType.GIF:
        case ImageFileType.GIF:
            formattedInstance = instance.gif();
            break;
        case ImageMIMEType.TIFF:
        case ImageFileType.TIFF:
            formattedInstance = instance.tiff({ quality: 100 });
            break;
        default:
            return { result: null, error: 'Unsupported image type: ' + type };
    }
    return { result: formattedInstance, error: null };
};
/**
 * Halves the resultion of the image in both dimensions
 * @author GustavBW
 * @since 0.0.1
 */
export async function downscaleImage(blob: ArrayBuffer, type: string, xScale: number, yScale: number, context?: ApplicationContext): Promise<ResErr<Blob>> {
    try {
        const image = sharp(Buffer.from(blob), { failOn: 'error' });
        const metadata = await image.metadata();

        const width = Math.floor(metadata.width! * xScale);
        const height = Math.floor(metadata.height! * yScale);
        context?.logger.log(`[lod_gen] Downscaling to width: ${width}, height: ${height}`);

        const resized = image.resize(width, height);
        const { result, error } = formatInstanceToType(resized, type);
        if (error !== null) {
            return { result: null, error: error };
        }

        const outputBuffer = await result.toBuffer();
        const outputBlob = new Blob([outputBuffer], { type });
        return { result: outputBlob, error: null };
    } catch (error) {
        return { result: null, error: (error as any).message };
    }
}
