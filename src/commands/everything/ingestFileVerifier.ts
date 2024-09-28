import { LogLevel } from "../../logging/simpleLogger";
import { readCompactDSNNotationRaw, readCompactTransformNotationRaw } from "../../processing/cliInputProcessor";
import { conformsToType } from "../../processing/typeChecker";
import type { ApplicationContext, Error, ResErr } from "../../ts/metaTypes";
import { DBDSN_TYPEDECL, INGEST_FILE_COLLECTION_ASSET_TYPEDECL, INGEST_FILE_COLLECTION_ENTRY_TYPEDECL, 
    INGEST_FILE_COLLECTION_FIELD_TYPEDECL, INGEST_FILE_SETTINGS_TYPEDECL, 
    INGEST_FILE_SINGLE_ASSET_FIELD_TYPEDECL, INGEST_FILE_SINGLE_ASSET_TYPEDECL, 
    IngestFileAssetType, TRANSFORM_DTO_TYPEDECL, type AutoIngestScript, type DBDSN, 
    type IngestFileCollectionAsset, type IngestFileSingleAsset, type TransformDTO 
} from "../../ts/types";

export const assureUniformTransform = (maybeTransform: string | TransformDTO): ResErr<TransformDTO> => {
    if (typeof maybeTransform === "string") {
        const compactNotationRes = readCompactTransformNotationRaw(maybeTransform);
        if (compactNotationRes.error !== null) {
            return {result: null, error: compactNotationRes.error};
        }
        return {result: compactNotationRes.result, error: null};
    } else if (typeof maybeTransform === "object") {
        const typeError = conformsToType(maybeTransform, TRANSFORM_DTO_TYPEDECL);
        if (typeError !== null) {
            return {result: null, error: "Transform field does not conform to type: " + typeError};
        }
        return {result: maybeTransform, error: null};
    } else {
        return {result: null, error: "Transform field is not compact CLI notation (string) or an object."};
    }
}

export const validateCollectionAssetEntry = (asset: IngestFileCollectionAsset, entryNum: number): string | null => {
    const topLevelTypeError = conformsToType(asset, INGEST_FILE_COLLECTION_ASSET_TYPEDECL);
    if (topLevelTypeError != null) {
        return "Type error in collection asset nr " + entryNum + ": " + topLevelTypeError;
    }

    const collectionFieldTypeError = conformsToType(asset.collection, INGEST_FILE_COLLECTION_FIELD_TYPEDECL);
    if (collectionFieldTypeError != null) {
        return "Type error in collection field on collection asset nr " + entryNum + ": " + collectionFieldTypeError;
    }

    for (let i = 0; i < asset.collection.entries.length; i++) {
        const source = asset.collection.entries[i];
        const sourceTypeError = conformsToType(source, INGEST_FILE_COLLECTION_ENTRY_TYPEDECL);
        if (sourceTypeError !== null) {
            return "Type error in source nr: " + i + " in collection asset nr: " + entryNum + ": " + sourceTypeError;
        }
        const uniformTransformAttempt = assureUniformTransform(source.transform);
        if (uniformTransformAttempt.error !== null) {
            return uniformTransformAttempt.error;
        }
        source.transform = uniformTransformAttempt.result;
    }

    return null;
}

export const validateSingleAssetEntry = (asset: IngestFileSingleAsset, entryNum: number, context?: ApplicationContext): string | null => {
    const typeError = conformsToType(asset, INGEST_FILE_SINGLE_ASSET_TYPEDECL);
    if (typeError != null) {
        return "Type error in single asset nr " + entryNum + ": " + typeError;
    }

    const typeErrorOfSingleField = conformsToType(asset.single, INGEST_FILE_SINGLE_ASSET_FIELD_TYPEDECL);
    if (typeErrorOfSingleField !== null) {
        return "Type error in single field of single asset nr " + entryNum + ": " + typeErrorOfSingleField
    }

    if(!asset.single.alias || asset.single.alias === null) {
        asset.single.alias = asset.single.source.split("/").pop()!;
        context?.logger.log("[ingest] No alias provided for single asset nr: " + entryNum + ", using source name as alias: " + 
            asset.single.alias, LogLevel.WARNING);
    }

    return null;
}

export const assureUniformDSN = (dsn: string | DBDSN): ResErr<DBDSN> => {
    if (typeof dsn === "string") {
        const compactNotationRes = readCompactDSNNotationRaw(dsn);
        if (compactNotationRes.error !== null) {
            return {result: null, error: compactNotationRes.error};
        }
        return {result: compactNotationRes.result, error: null};
    } else if (typeof dsn === "object") {
        const typeError = conformsToType(dsn, DBDSN_TYPEDECL);
        if (typeError !== null) {
            return {result: null, error: "DSN object does not conform to expected type:\n\t" + typeError};
        }
        if (dsn.sslMode === undefined || dsn.sslMode === null) {
            dsn.sslMode = "disable";
        }
        return {result: dsn, error: null};
    } else {
        return {result: null, error: "DSN field is not compact CLI notation (\"host port, username password, dbName, sslMode\") or an object."};
    }
}

export const verifyIngestFileSettings = (rawFile: any, context?: ApplicationContext): Error | undefined => {
    if (!rawFile.settings || rawFile.settings === null) {
        return "No settings field and corresponding object found in ingest file.";
    }

    if (!rawFile.settings.dsn || rawFile.settings.dsn === null) {
        return "No dsn field found in ingest file under settings.";
    }
    const uniformDSNAttempt = assureUniformDSN(rawFile.settings.dsn);
    if (uniformDSNAttempt.error !== null) {
        return uniformDSNAttempt.error;
    }
    rawFile.settings.dsn = uniformDSNAttempt.result;
    const fullSettingsCheckResult = conformsToType(rawFile.settings, INGEST_FILE_SETTINGS_TYPEDECL);
    if (fullSettingsCheckResult !== null) {
        return "Settings field does not conform to type: " + fullSettingsCheckResult;
    }
}

export const verifyIngestFileAssets = (rawFile: any, context?: ApplicationContext): Error | undefined => {
    if (!rawFile.assets || rawFile.assets === null) {
        return "No assets field and corresponding object found in ingest file.";
    }

    if (!Array.isArray(rawFile.assets) || rawFile.assets.length === 0) {
        return "Assets field in ingest file is not an array or is an empty array.";
    }

    let singleCount = 1;
    let collectionCount = 1;
    for (let i = 0; i < rawFile.assets.length; i++) {
        const asset = rawFile.assets[i];
        if (!asset.type || asset.type === null) {
            return "No type field found in asset nr:" + i;
        }
        if (!asset.useCase || asset.useCase === null) {
            return "No useCase field found in asset nr:" + i;
        }
        switch (asset.type) {
        case IngestFileAssetType.SINGLE: {
                const singleAsset = asset as IngestFileSingleAsset;
                const error = validateSingleAssetEntry(singleAsset, singleCount, context);
                singleCount++;
                if (error !== null) {
                    return error;
                }
                break;
            }
        case IngestFileAssetType.COLLECTION: {
                const collectionAsset = asset as IngestFileCollectionAsset;
                const error = validateCollectionAssetEntry(collectionAsset, collectionCount);
                collectionCount++;
                if (error !== null) {
                    return error;
                }
                break;
            }
        default: {
                return "Unknown asset type in asset nr:" + i;
            }
        }
    }
}

export const verifyIngestFile = (rawFile: any, context?: ApplicationContext): ResErr<AutoIngestScript> => {
    const settingsError = verifyIngestFileSettings(rawFile, context);
    if (settingsError !== undefined) {
        return { result: null, error: settingsError };
    }

    const assetsError = verifyIngestFileAssets(rawFile, context);
    if (assetsError !== undefined) {
        return { result: null, error: assetsError };
    }

    return {result: rawFile as AutoIngestScript, error: null};
}