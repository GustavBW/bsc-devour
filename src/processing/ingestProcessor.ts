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
    context.logger.logAndPrint('[ingest] Processing main ingest file.');

    const tooManyErrors = await processAssetList(ingestScript.assets, settings, errors, context);
    if (tooManyErrors) {
        return { result: null, error: 'Too many errors, aborting' };
    }

    if (subFiles.length < 0) {
        return { result: 'Ingest file succesfully processed and uploaded', error: null };
    }
    context.logger.logAndPrint('');
    for (const subFile of subFiles) {
        context.logger.logAndPrint('[ingest] Processing sub-file: ' + subFile.path);
        const tooManyErrors = await processAssetList(subFile.assets, settings, errors, context);
        if (tooManyErrors) {
            return { result: null, error: 'Too many errors, aborting' };
        }
    }
    return { result: 'Ingest file and subFiles succesfully processed and uploaded', error: null };
};

/**
 * @returns true if there's too many errors
 */
const processAssetList = async (
    assets: IngestFileAssetEntry[],
    settings: IngestFileSettings,
    errors: Error[],
    context: ApplicationContext,
): Promise<boolean> => {
    for (const asset of assets) {
        const type = asset.type;
        if (errors.length > settings.allowedFailures) {
            context.logger.logAndPrint('[ingest] Too many errors, aborting:\n' + errors.join('\n\t'), LogLevel.ERROR);
            return true;
        }

        switch (type) {
            case IngestFileAssetType.SINGLE: {
                context.logger.logAndPrint('[ingest]\tProcessing asset id ' + asset.single.id + ': ' + asset.single.alias);
                const res = await processGraphicalAsset(asset, settings, context);
                if (res.error !== null) {
                    context.logger.log('[ingest] Error while processing single asset: \n\t' + res.error, LogLevel.ERROR);
                    errors.push(res.error);
                }
                break;
            }
            case IngestFileAssetType.COLLECTION: {
                context.logger.logAndPrint('[ingest]\tProcessing collection id ' + asset.collection.id + ': ' + asset.collection.name);
                const res = await processCollection(asset, context);
                if (res.error !== null) {
                    context.logger.log('[ingest] Error while processing single asset: \n\t' + res.error, LogLevel.ERROR);
                    errors.push(res.error);
                }
                break;
            }
            default: {
                context.logger.log('[ingest] Unknown asset type: ' + type, LogLevel.ERROR);
                errors.push('Unknown asset type: ' + type);
            }
        }
    }
    return false;
};

const processGraphicalAsset = async (
    asset: IngestFileSingleAsset,
    settings: IngestFileSettings,
    context: ApplicationContext,
): Promise<ResErr<string>> => {
    context.logger.log('[ingest] Uploading single asset id: ' + asset.single.id);

    //TODO: LOD gen., etc.
    const useCase = asset.useCase;
    const { result, error } = await prepareSingleAssetForUpload(asset.single, settings, useCase, context);
    if (error !== null) {
        context.logger.log(`[ingest] Error preparing single asset for upload: ${error}`, LogLevel.ERROR);
        return { result: null, error: error };
    }
    const uploadRes = await context.db.instance.uploadAsset(result);
    if (uploadRes.error !== null) {
        context.logger.log(`[ingest] Error uploading single asset: ${uploadRes.error}`, LogLevel.ERROR);
        return { result: null, error: uploadRes.error };
    }
    return { result: 'Single asset id: ' + asset.single.id + ' uploaded', error: null };
};

const processCollection = async (asset: IngestFileCollectionAsset, context: ApplicationContext): Promise<ResErr<string>> => {
    const collection = asset.collection;
    context.logger.log('[ingest] Uploading collection name: ' + collection.name);
    const res = await context.db.instance.establishCollection({
        useCase: asset.useCase,
        name: collection.name,
        entries: collection.entries,
        id: collection.id,
    });
    if (res.error !== null) {
        context.logger.log('[ingest] Error while establishing collection: \n\t' + res.error, LogLevel.ERROR);
        return { result: null, error: res.error };
    }
    return { result: 'Collection uploaded', error: null };
};

export const prepareSingleAssetForUpload = async (
    asset: IngestFileSingleAssetField,
    settings: IngestFileSettings,
    useCase: AssetUseCase,
    context: ApplicationContext,
): Promise<ResErr<UploadableAsset>> => {
    const { result, error } = await fetchBlobFromUrl(asset.source, context);
    if (error !== null) {
        context.logger.log(`[sai cmd] Error fetching blob from url ${asset.source}: ${error}`, LogLevel.ERROR);
        return { result: null, error: error };
    }
    const blob = result;
    const contentTypeRes = findConformingMIMEType(blob.type);
    if (contentTypeRes.error !== null) {
        context.logger.log(`[sai cmd] Error determining MIME type for blob: ${contentTypeRes.error}`, LogLevel.ERROR);
        return { result: null, error: contentTypeRes.error };
    }
    if (contentTypeRes.result === ImageMIMEType.SVG) {
        // SVG TRANSFORM CASE
        if (!asset.width || !asset.height || asset.width <= 1 || asset.height <= 1) {
            context.logger.log(
                `[sai cmd] SVGs must have width and height. It can be provided through a transforms' xScale and yScale properties.`,
                LogLevel.ERROR,
            );
            return {
                result: null,
                error: "SVGs must have width and height. It can be provided through a transforms' xScale and yScale properties.",
            };
        }
    } else {
        const { result, error } = await getMetaDataAsIfImage(blob, context);
        if (error !== null) {
            context.logger.log(`[sai cmd] Error getting metadata from image: ${error}`, LogLevel.ERROR);
            return { result: null, error: error };
        }
        asset.width = result.width;
        asset.height = result.height;
    }

    // Generate LODs
    const lods = await generateLODs(blob, settings.LODThreshold, context, contentTypeRes.result);
    if (lods.error !== null) {
        context.logger.log(`[sai cmd] Error generating LODs: ${lods.error}`, LogLevel.ERROR);
        return { result: null, error: lods.error };
    }

    return {
        result: {
            id: asset.id,
            width: asset.width!,
            height: asset.height!,
            useCase: useCase,
            type: contentTypeRes.result,
            alias: asset.alias!,
            lods: lods.result,
        },
        error: null,
    };
};
