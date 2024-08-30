import { LogLevel } from "../logging/simpleLogger";
import type { ApplicationContext, ResErr } from "../ts/metaTypes";
import type { AutoIngestScript, IngestFileCollectionAsset, IngestFileCollectionField, IngestFileSettings, IngestFileSingleAsset } from "../ts/types";

export const processIngestFile = async (ingestScript: AutoIngestScript, context: ApplicationContext): Promise<ResErr<string>> => {
    const dbErr = await context.db.connect(ingestScript.settings.dsn, context);
    if (dbErr !== null) {
        return {result: null, error: dbErr};
    }
    context.logger.log("[IngestFile] Processing ingest file.");
    
    for (const asset of ingestScript.assets) {
        if (asset.type === "single") {
            const res = await processGraphicalAsset(asset as IngestFileSingleAsset, ingestScript.settings, context);
            if (res.error !== null) {
                return {result: null, error: res.error};
            }
        } else if (asset.type === "collection") {
            const res = await processCollection(asset as IngestFileCollectionAsset, context);
            if (res.error !== null) {
                return {result: null, error: res.error};
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