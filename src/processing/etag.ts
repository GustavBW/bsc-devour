import type { ResErr } from '../ts/metaTypes';
import { createHash } from 'crypto';

export const computeETag = async (blob: Blob): Promise<ResErr<string>> => {

  try{
    // Convert Blob to ArrayBuffer to Buffer
    const arrayBuffer = await blob.arrayBuffer();  
    const asBuffer = Buffer.from(arrayBuffer);

    const hash = createHash('sha256');
    hash.update(asBuffer);

    return {result: hash.digest('hex'), error: null};
  } catch (e) {
    return {result: null, error: "Error computing etag: " + JSON.stringify(e)};
  } 
}