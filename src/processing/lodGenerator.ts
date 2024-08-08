import sharp from 'sharp';
import type { ResErr } from '../ts/metaTypes.ts';
import type { LODDTO } from '../ts/types.ts';

const downscalableImageTypes = ["IMAGE/JPEG", "IMAGE/PNG", "IMAGE/WEBP", "IMAGE/AVIF", "IMAGE/GIF", "IMAGE/TIFF"].map(k => k.toLowerCase());
/**
 * @author GustavBW
 * @since 0.0.1
 * @param blob image
 * @param sizeThreshold in kilobytes 
 * @returns 
 */
export async function generateLODs(blob: Blob, sizeThreshold: number): Promise<ResErr<LODDTO[]>> {
    if(!downscalableImageTypes.includes(blob.type.toLowerCase())) {
        return {result: null, error: `Unsupported image type: ${blob.type}`};
    }
    if(blob.size == 0) { // Empty blob detected
        return {result: null, error: "This blob is empty."};
    }
    const lodsGenerated: LODDTO[] = [{detailLevel: 0, blob: blob}];
    if(blob.size / 1000 < sizeThreshold) { // Already below threshold
        return {result: lodsGenerated, error: null};
    }
    let currentBlob = blob;
    let detailLevel = 1;
    while (currentBlob.size / 1000 > sizeThreshold) {
        const {result, error} = await downscaleImage(currentBlob);
        if (error !== null) {
            return {result: null, error: error};
        }
        lodsGenerated.push({detailLevel: detailLevel, blob: result});
        currentBlob = result;
        detailLevel++;
    }
    return {result: lodsGenerated, error: null};
}

export async function downscaleImage(blob: Blob): Promise<ResErr<Blob>> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const image = sharp(Buffer.from(arrayBuffer));
      const metadata = await image.metadata();

      const width = Math.floor(metadata.width! / 2);
      const height = Math.floor(metadata.height! / 2);

      const outputBuffer = await image.resize(width, height).toBuffer();

      // Log buffer size and some content for debugging
      //console.log('Output Buffer Size:', outputBuffer.length);
      //console.log('Output Buffer Slice:', outputBuffer.slice(0, 20)); // Log first 20 bytes

      // Validate the buffer by creating an image from it
      const tempImage = sharp(outputBuffer);
      const tempMetadata = await tempImage.metadata();
      //console.log('Temporary Image Metadata:', tempMetadata);

      // Construct the Blob with the appropriate MIME type
      const outputBlob = new Blob([outputBuffer], { type: blob.type });

      return { result: outputBlob, error: null };
    } catch (error) {
      return { result: null, error: (error as any).message };
    }
  }
  