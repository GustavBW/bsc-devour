import { LogLevel } from '../../logging/simpleLogger.ts';
import { readCompactDSNNotation, readCompactDSNNotationRaw, readCompactTransformNotation, readCompactTransformNotationRaw, readUrlArg } from '../../processing/cliInputProcessor.ts';
import { conformsToType } from '../../processing/typeChecker.ts';
import type { ApplicationContext, CLIFunc, ResErr } from '../../ts/metaTypes.ts';
import { INGEST_FILE_COLLECTION_ENTRY_TYPEDECL, COLLECTION_ENTRY_DTO_TYPEDECL, DBDSN_TYPEDECL, INGEST_FILE_COLLECTION_ASSET_TYPEDECL, INGEST_FILE_COLLECTION_FIELD_TYPEDECL, INGEST_FILE_SINGLE_ASSET_TYPEDECL, INGEST_FILE_SINGLE_ASSET_FIELD_TYPEDECL, TRANSFORM_DTO_TYPEDECL, type AutoIngestScript, type DBDSN, type IngestFileAssetEntry, type IngestFileCollectionAsset, type IngestFileSingleAsset, type TransformDTO } from '../../ts/types.ts';

/**
 * @author GustavBW
 * @since 0.0.1
 */
const handleIngestFileInput = async (args: string[], context: ApplicationContext): Promise<ResErr<string>> => {
    let url = "";
    for (const arg of args) {
        if (arg.startsWith("path=")) {
            const {result, error} = readUrlArg(arg);
            if (error !== null) {
                return {result: null, error: error};
            }
            url = result;
        }
    }

    if (url === "") {
        return {result: null, error: "No path argument provided"};
    }
    context.logger.log("[IngestFile] Reading ingest file from: " + url);
    const {result, error} = await readIngestFile(url); if (error !== null) {
        context.logger.log("[IngestFile] Failed to read ingest file: \n\t" + error, LogLevel.FATAL);
        return {result: null, error: error};
    }
    context.logger.log("[IngestFile] Successfully read ingest file.");
    context.logger.log("[IngestFile] Verifying ingest file.");
    const verificationResult = verifyIngestFile(result); if (verificationResult.error !== null) {
        context.logger.log("[IngestFile] Failed to verify ingest file: \n\t" + verificationResult.error, LogLevel.FATAL);
        return {result: null, error: verificationResult.error};
    }
    const ingestScript = verificationResult.result;
    context.logger.log("[IngestFile] Successfully verified ingest file.");


    return processIngestFile(ingestScript, context);
}

const processIngestFile = async (ingestScript: AutoIngestScript, context: ApplicationContext): Promise<ResErr<string>> => {
    const dbErr = await context.db.connect(ingestScript.settings.dsn, context);
    if (dbErr !== null) {
        return {result: null, error: dbErr};
    }
    context.logger.log("[IngestFile] Processing ingest file.");
    
    for (const asset of ingestScript.assets) {
        if (asset.type === "single") {
            const singleAsset = asset as IngestFileSingleAsset;
            context.logger.log("[IngestFile] Uploading single asset id: " + singleAsset.id);
            //TODO: LOD gen., etc.

        } else if (asset.type === "collection") {
            const collectionAsset = asset as IngestFileCollectionAsset;
            context.logger.log("[IngestFile] Uploading collection name: " + collectionAsset.name);
            const useCase = collectionAsset.useCase;
            const name = collectionAsset.name;
            const entries = collectionAsset.collection.entries;
            const res = await context.db.instance.establishCollection({
                useCase: useCase,
                name: name,
                entries: entries
            });
            if (res.error !== null) {
                context.logger.log("[IngestFile] Error while establishing collection: \n\t" + res.error, LogLevel.ERROR);
                return {result: null, error: res.error};
            }
        }
    }

    return {result: "Ingest file succesfully processed and uploaded", error: null};
}

/**
 * @author GustavBW
 * @since 0.0.1
 */
export const INGEST_FILE_INPUT_CMD: CLIFunc<string> = {
    func: handleIngestFileInput,
    whatToDoWithResult: (result: string) => {
        console.log(result);
    },
    identifier: "everything",
    documentation: `
    Devours all assets specified in the file according to the given settings.
    The source may be an http url or a filepath.
    To see an example of the ingest file format, run "bun devour help ingestFileFormat".
    `,
    abstractExample: "bun devour everything path=\"url\"",
}

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

export const validateSingleAssetEntry = (asset: IngestFileSingleAsset, entryNum: number): string | null => {
    const typeError = conformsToType(asset, INGEST_FILE_SINGLE_ASSET_TYPEDECL);
    if (typeError != null) {
        return "Type error in single asset nr " + entryNum + ": " + typeError;
    }

    const typeErrorOfSingleField = conformsToType(asset.single, INGEST_FILE_SINGLE_ASSET_FIELD_TYPEDECL);
    if (typeErrorOfSingleField !== null) {
        return "Type error in single field of single asset nr " + entryNum + ": " + typeErrorOfSingleField
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

export const verifyIngestFile = (rawFile: any): ResErr<AutoIngestScript> => {
    if (rawFile.settings === undefined || rawFile.settings === null) {
        return { result: null, error: "No settings field and corresponding object found in ingest file." };
    }

    if (rawFile.settings.dsn === undefined || rawFile.settings.dsn === null) {
        return { result: null, error: "No dsn field found in ingest file under settings." };
    }
    const uniformDSNAttempt = assureUniformDSN(rawFile.settings.dsn);
    if (uniformDSNAttempt.error !== null) {
        return { result: null, error: uniformDSNAttempt.error}
    }
    rawFile.settings.dsn = uniformDSNAttempt.result;

    if (rawFile.assets === undefined || rawFile.assets === null) {
        return { result: null, error: "No assets field and corresponding object found in ingest file." };
    }

    if (!Array.isArray(rawFile.assets) || rawFile.assets.length === 0) {
        return { result: null, error: "Assets field in ingest file is not an array or is an empty array." };
    }

    for (let i = 0; i < rawFile.assets.length; i++) {
        const asset = rawFile.assets[i];
        if (asset.type === undefined || asset.type === null) {
            return { result: null, error: "No type field found in asset nr:" + i };
        }
        if (asset.useCase === undefined || asset.useCase === null) {
            return { result: null, error: "No useCase field found in asset nr:" + i };
        }
        if (asset.type === "single") {
            const singleAsset = asset as IngestFileSingleAsset;
            const error = validateSingleAssetEntry(singleAsset, i);
            if (error !== null) {
                return { result: null, error: error };
            }
        } else if (asset.type === "collection") {
            const collectionAsset = asset as IngestFileCollectionAsset;
            const error = validateCollectionAssetEntry(collectionAsset, i);
            if (error !== null) {
                return { result: null, error: error };
            }
        } else {
            return { result: null, error: "Unknown asset type in asset nr:" + i };
        }
    }

    return {result: rawFile as AutoIngestScript, error: null};
}
/**
 * Read the file as a string. Then parse as JSON. No type checks so far
 * @author GustavBW
 * @since 0.0.1
 */
export const readIngestFile = async (url: string): Promise<ResErr<any>> => {
    const file = Bun.file(url);
    const fileExists = await file.exists();
    if (!fileExists) {
        return { result: null, error: "File: \""+url+"\" does not exist. WD: " + import.meta.dir };
    }
    const fileContents = await file.text();
    let ingestScript: any;
    try {
        ingestScript = JSON.parse(fileContents);
    } catch (error) {
        return { result: null, error: "Failed to parse IngestFile: " + error };
    }

    return { result: ingestScript, error: null };
}