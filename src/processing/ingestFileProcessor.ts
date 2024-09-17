import { LogLevel } from "../logging/simpleLogger";
import type { ApplicationContext, ResErr, Error } from "../ts/metaTypes";
import { IngestFileAssetType, type AutoIngestScript, type IngestFileCollectionAsset, type IngestFileCollectionField, type IngestFileSettings, type IngestFileSingleAsset } from "../ts/types";

export const processIngestFile = async (ingestScript: AutoIngestScript, context: ApplicationContext): Promise<ResErr<string>> => {
    const dbErr = await context.db.connect(ingestScript.settings.dsn, context);
    if (dbErr !== null) {
        return {result: null, error: dbErr};
    }
    context.logger.log("[IngestFile] Processing ingest file.");
    let errors: Error[] = [];
    
    for (const asset of ingestScript.assets) {
        const type = asset.type;
        if (errors.length > ingestScript.settings.allowedFailures) {
            context.logger.log("[IngestFile] Too many errors, aborting", LogLevel.ERROR);
            return {result: null, error: "Too many errors, aborting"};
        }

        switch (type) {
            case IngestFileAssetType.SINGLE: {
                context.logger.log("[IngestFile]\tsingle asset: " + asset.single.alias + " with id: " + asset.single.id);
                const res = await processGraphicalAsset(asset, ingestScript.settings, context);
                if (res.error !== null) {
                    context.logger.log("[IngestFile] Error while processing single asset: \n\t" + res.error, LogLevel.ERROR);
                    errors.push(res.error);
                } 
                break;
            }
            case IngestFileAssetType.COLLECTION: {
                context.logger.log("[IngestFile]\tcollection asset: " + asset.collection.name);
                const res = await processCollection(asset, context);
                if (res.error !== null) {
                    context.logger.log("[IngestFile] Error while processing single asset: \n\t" + res.error, LogLevel.ERROR);
                    errors.push(res.error);
                }
                break;
            }
            default: {
                context.logger.log("[IngestFile] Unknown asset type: " + type, LogLevel.ERROR);
                errors.push("Unknown asset type: " + type);
            }
        }
    }

    return {result: "Ingest file succesfully processed and uploaded", error: null};
}

const processGraphicalAsset = async (asset: IngestFileSingleAsset, settings: IngestFileSettings, context: ApplicationContext): Promise<ResErr<string>> => {
    context.logger.log("[IngestFile] Uploading single asset id: " + asset.single.id);
    //TODO: LOD gen., etc.


    return {result: "Single asset id: "+asset.single.id+" uploaded", error: null};
}

const processCollection = async (asset: IngestFileCollectionAsset, context: ApplicationContext): Promise<ResErr<string>> => {
    const collection = asset.collection;
    context.logger.log("[IngestFile] Uploading collection name: " + collection.name);
    const res = await context.db.instance.establishCollection({
        useCase: asset.useCase,
        name: collection.name,
        entries: collection.entries
    });
    if (res.error !== null) {
        context.logger.log("[IngestFile] Error while establishing collection: \n\t" + res.error, LogLevel.ERROR);
        return {result: null, error: res.error};
    }
    return {result: "Collection uploaded", error: null};
}