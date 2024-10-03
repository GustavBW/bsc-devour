import { LogLevel } from '../logging/simpleLogger';
import { fetchBlobFromUrl } from '../networking/blobFetcher';
import type { UploadableAsset } from '../networking/dbConn';
import {
    IngestFileAssetType,
    type AutoIngestScript,
    type IngestFileAssetEntry,
    type IngestFileCollectionAsset,
    type IngestFileSettings,
    type IngestFileSingleAsset,
    type IngestFileSingleAssetField,
    type PreparedAutoIngestSubScript,
} from '../ts/ingestFileTypes';
import { type ApplicationContext, type ResErr, type Error, ImageMIMEType } from '../ts/metaTypes';
import { AssetUseCase } from '../ts/types';
import { getMetaDataAsIfImage } from './imageUtil';
import { generateLODs } from './lodGenerator';
import { findConformingMIMEType } from '../runtimeTypeChecker/type';
import { joinOmitSeperatorOnLast } from '../runtimeTypeChecker/arrayUtil';

export type TracableAssetEntry = IngestFileSingleAsset & { originFile: string };
export type TracableCollectionEntry = IngestFileCollectionAsset & { originFile: string };
/**
 * Assumes the id ranges of any subfiles has been verified.
 * @param ingestScript main ingest script containing settings
 * @param context application context
 * @param subFiles any amount of subfiles
 * @returns 
 */
export const processIngestFile = async (
    ingestScript: AutoIngestScript,
    context: ApplicationContext,
    subFiles: PreparedAutoIngestSubScript[],
): Promise<ResErr<string>> => {
    const dbErr = await context.db.connect(ingestScript.settings.dsn, context);
    if (dbErr !== null) {
        return { result: null, error: dbErr };
    }
    let errors: Error[] = [];
    const settings = ingestScript.settings;
    context.logger.logAndPrint('[ingest] Compiling files.');
    const assets: TracableAssetEntry[] = [];
    const collections: TracableCollectionEntry[] = [];
    for (const asset of ingestScript.assets) {
        const type = asset.type;
        if (type === IngestFileAssetType.SINGLE) {
            assets.push({...asset, originFile: 'main ingest file'});
        } else if (type === IngestFileAssetType.COLLECTION) {
            collections.push({...asset, originFile: 'main ingest file'});
        } else {
            context.logger.log('[ingest] Unknown asset type: ' + type, LogLevel.ERROR);
            errors.push('Unknown asset type: ' + type + " of asset " + JSON.stringify(asset) + " in main ingest file");
        }
    }
    for (const subFile of subFiles) {
        for (const asset of subFile.assets) {
            const type = asset.type;
            if (type === IngestFileAssetType.SINGLE) {
                assets.push({...asset, originFile: subFile.path});
            } else if (type === IngestFileAssetType.COLLECTION) {
                collections.push({...asset, originFile: subFile.path});
            } else {
                context.logger.log('[ingest] Unknown asset type: ' + type, LogLevel.ERROR);
                errors.push('Unknown asset type: ' + type + " of asset " + JSON.stringify(asset) + " in file " + subFile.path);
            }
        }
    }
    context.logger.logAndPrint('[ingest] Files compiled. Processing assets');
    const assetErrors = (await Promise.all(assets.map((asset) => processGraphicalAsset(asset, settings, context))))
        .filter((res) => res !== undefined);
    
    if (assetErrors.length > 0) {
        return { result: null, error: "Error processing assets:\n\t" + joinOmitSeperatorOnLast(assetErrors, ",\n\t") };
    }

    context.logger.logAndPrint('[ingest] Assets processed. Processing collections');
    const collectionErrors = (await Promise.all(collections.map((collection) => processCollection(collection, context))))
        .filter((res) => res !== undefined);

    if (collectionErrors.length > 0) {
        return { result: null, error: "Error processing collections:\n\t" + joinOmitSeperatorOnLast(collectionErrors, ", ") };
    }

    return { result: 'Ingest file and subFiles succesfully processed and uploaded', error: null };
};

const processGraphicalAsset = async (
    asset: TracableAssetEntry,
    settings: IngestFileSettings,
    context: ApplicationContext,
): Promise< Error | undefined > => {
    context.logger.log('[ingest] Uploading single asset id: ' + asset.single.id + " of file " + asset.originFile);

    const useCase = asset.useCase;
    const { result, error } = await prepareSingleAssetForUpload(asset, settings, useCase, context);
    if (error !== null) {
        context.logger.log(`[ingest] Error preparing single asset for upload:\n\t${error}`, LogLevel.ERROR);
        return `[ingest] Error preparing single asset for upload:\n\t${error}`;
    }
    const uploadRes = await context.db.instance.uploadAsset(result);
    if (uploadRes.error !== null) {
        context.logger.log(`[ingest] Error uploading single asset:\n\t${uploadRes.error}`, LogLevel.ERROR);
        return `[ingest] Error uploading single asset:\n\t${uploadRes.error}`;
    }
    context.logger.log('[ingest] Single asset id: ' + asset.single.id + ' of file ' + asset.originFile + ' uploaded');
};

const processCollection = async (asset: TracableCollectionEntry, context: ApplicationContext): Promise< Error | undefined > => {
    const collection = asset.collection;
    context.logger.log('[ingest] Uploading collection name: ' + collection.name + " of file " + asset.originFile);
    const res = await context.db.instance.establishCollection({
        useCase: asset.useCase,
        name: collection.name,
        entries: collection.entries,
        id: collection.id,
    });
    if (res.error !== null) {
        context.logger.log(`[ingest] Error while establishing collection ${collection.name} of file ${asset.originFile}:\n\t` + res.error, LogLevel.ERROR);
        return res.error;
    }
};

export const prepareSingleAssetForUpload = async (
    asset: TracableAssetEntry,
    settings: IngestFileSettings,
    useCase: AssetUseCase,
    context: ApplicationContext,
): Promise<ResErr<UploadableAsset>> => {
    const single = asset.single;
    const { result, error } = await fetchBlobFromUrl(single.source, context);
    if (error !== null) {
        context.logger.log(`[ip] Error fetching blob for asset id ${single.id} of file ${asset.originFile} from url ${single.source}:\n\t\t${error}`, LogLevel.ERROR);
        return { result: null, error: `[ip] Error fetching blob for asset id ${single.id} of file ${asset.originFile} from url ${single.source}:\n\t\t${error}` };
    }
    const blob = result;
    const contentTypeRes = findConformingMIMEType(blob.type);
    if (contentTypeRes.error !== null) {
        context.logger.log(`[ip] Error determining MIME type for asset id ${single.id} of file ${asset.originFile} for blob:\n\t\t${contentTypeRes.error}`, LogLevel.ERROR);
        return { result: null, error: `[ip] Error determining MIME type for asset id ${single.id} of file ${asset.originFile} for blob:\n\t\t${contentTypeRes.error}` };
    }
    if (contentTypeRes.result === ImageMIMEType.SVG) {
        // SVG TRANSFORM CASE
        if (!single.width || !single.height || single.width <= 1 || single.height <= 1) {
            context.logger.log(
                `[ip] error in asset id ${single.id} of file ${asset.originFile}:\n\t\tSVGs must have width and height. It can be provided through a transforms' xScale and yScale properties.`,
                LogLevel.ERROR,
            );
            return {
                result: null,
                error: `[ip] Error in asset id ${single.id} of file ${asset.originFile}:\n\t\tSVGs must have width and height. It can be provided through a transforms' xScale and yScale properties.`,
            };
        }
    } else {
        const { result, error } = await getMetaDataAsIfImage(blob, context);
        if (error !== null) {
            context.logger.log(`[ip] Error in asset id ${single.id} of file ${asset.originFile}:\n\t\tgetting metadata from image: ${error}`, LogLevel.ERROR);
            return { result: null, error: error };
        }
        single.width = result.width;
        single.height = result.height;
    }

    // Generate LODs
    const lods = await generateLODs(blob, settings.LODThreshold, context, contentTypeRes.result);
    if (lods.error !== null) {
        context.logger.log(`[ip] Error in asset id ${single.id} of file ${asset.originFile}: generating LODs:\n\t\t${lods.error}`, LogLevel.ERROR);
        return { result: null, error: lods.error };
    }

    return {
        result: {
            id: single.id,
            width: single.width!,
            height: single.height!,
            useCase: useCase,
            type: contentTypeRes.result,
            alias: single.alias!,
            lods: lods.result,
        },
        error: null,
    };
};
