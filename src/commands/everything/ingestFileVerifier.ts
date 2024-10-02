import { LogLevel } from "../../logging/simpleLogger";
import { readCompactDSNNotationRaw, readCompactTransformNotationRaw } from "../../processing/cliInputProcessor";
import { conformsToType } from "../../runtimeTypeChecker/type";
import { 
    INGEST_FILE_COLLECTION_ASSET_TYPEDECL, INGEST_FILE_COLLECTION_FIELD_TYPEDECL, INGEST_FILE_SETTINGS_TYPEDECL, 
    INGEST_FILE_SINGLE_ASSET_FIELD_TYPEDECL, INGEST_FILE_SINGLE_ASSET_TYPEDECL, IngestFileAssetType, 
    type AutoIngestScript, type AutoIngestSubScript, type IngestFileAssetEntry, type IngestFileCollectionAsset, type IngestFileSettings, type IngestFileSingleAsset, 
    type SettingsSubFile 
} from "../../ts/ingestFileTypes";
import type { ApplicationContext, Error, ResErr } from "../../ts/metaTypes";
import { DBDSN_TYPEDECL, INGEST_FILE_COLLECTION_ENTRY_TYPEDECL, 
    TRANSFORM_DTO_TYPEDECL, type DBDSN, 
    type TransformDTO 
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

export const verifyIngestFileSettings = (settings: IngestFileSettings, context?: ApplicationContext): Error | undefined => {
    if (!settings || settings === null) {
        return "No settings field and corresponding object found in ingest file.";
    }

    if (!settings.dsn || settings.dsn === null) {
        return "No dsn field found in ingest file under settings.";
    }
    const uniformDSNAttempt = assureUniformDSN( settings.dsn);
    if (uniformDSNAttempt.error !== null) {
        return uniformDSNAttempt.error;
    }
    settings.dsn = uniformDSNAttempt.result;
    const fullSettingsCheckResult = conformsToType(settings, INGEST_FILE_SETTINGS_TYPEDECL);
    if (fullSettingsCheckResult !== null) {
        return "Settings field does not conform to type: " + fullSettingsCheckResult;
    }
}

export const verifyIngestFileAssets = (assets: IngestFileAssetEntry[], context?: ApplicationContext): Error | undefined => {
    if (!assets || assets === null) {
        return "No assets field and corresponding object found in ingest file.";
    }

    if (!Array.isArray(assets)) {
        return "Assets field in ingest file is not an array.";
    }

    let singleCount = 1;
    let collectionCount = 1;
    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
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
    if(!rawFile || rawFile === null) {
        return {result: null, error: "Ingest File was null or undefined."};
    }
    const settingsError = verifyIngestFileSettings(rawFile.settings, context);
    if (settingsError !== undefined) {
        return { result: null, error: settingsError };
    }

    const assetsError = verifyIngestFileAssets(rawFile.assets, context);
    if (assetsError !== undefined) {
        return { result: null, error: assetsError };
    }

    return {result: rawFile as AutoIngestScript, error: null};
}

export const checkIDRangesOfSubFiles = (subFiles: SettingsSubFile[], context?: ApplicationContext): Error | undefined => {
    for (let i = 0; i < subFiles.length; i++) {
        const subFileA = subFiles[i];

        for (let j = i + 1; j < subFiles.length; j++) {
            const subFileB = subFiles[j];

            if (subFileA.path === subFileB.path) {
                context?.logger.log("[if-verifier] Duplicate path in sub-files " + i + " and " + j + ", path of first:" + subFileA.path, LogLevel.ERROR);
                return "Duplicate path in sub-files " + i + " and " + j + ", path of first:" + subFileA.path;
            }
            for (let k = 0; k < subFileA.idRanges.length; k++) {
                const rangeASubFileA = subFileA.idRanges[k];

                for (let m = 0; m < subFileB.idRanges.length; m++) {
                    const rangeBSubFileB = subFileB.idRanges[m];
                    if (rangeASubFileA[0] <= rangeBSubFileB[1] && rangeASubFileA[1] >= rangeBSubFileB[0]) {
                        context?.logger.log("[if-verifier] ID range overlap between sub-file " + i + " and " + j + ", of paths: " + subFileA.path + " and " + subFileB.path);
                        return "ID range overlap between sub-file "+i+" and "+j+", of paths: " + subFileA.path + " and " + subFileB.path;
                    }
                }
            }
        }
    }
}

export const verifySubFileIDAssignments = (subFile: SettingsSubFile, script: AutoIngestSubScript, context?: ApplicationContext): Error | undefined => {
    for (const asset of script.assets) {
        let id = -1;
        if (asset.type === IngestFileAssetType.SINGLE) {
            id = asset.single.id;
        } else if (asset.type === IngestFileAssetType.COLLECTION) {
            id = asset.collection.id;
        } else {
            context?.logger.log("[if-verifier] Unknown asset type in sub-file. Unable to verify ID assignment.", LogLevel.ERROR);
            return "Unknown asset type in sub-file. Unable to verify ID assignment.";
        }
        let isOkay = false;
        for (const range of subFile.idRanges) {
            if (id >= range[0] && id <= range[1]) {
                isOkay = true;
            }
        }
        if (!isOkay) {
            context?.logger.log("[if-verifier] ID "+id+" in sub-file "+subFile.path+" is not within assigned id ranges.");
            return "ID "+id+" in sub-file "+subFile.path+" is not within assigned id ranges.\n\t"
                + "Ranges (inclusive): "+subFile.idRanges.map(range => "["+range[0]+"->"+range[1]+"]").join(", ");
        }
    }
}