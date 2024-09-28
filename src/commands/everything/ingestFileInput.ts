import { LogLevel } from '../../logging/simpleLogger.ts';
import { readCompactDSNNotation, readCompactDSNNotationRaw, readCompactTransformNotation, readCompactTransformNotationRaw, readUrlArg } from '../../processing/cliInputProcessor.ts';
import { processIngestFile } from '../../processing/ingestProcessor.ts';
import { conformsToType } from '../../processing/typeChecker.ts';
import type { ApplicationContext, CLIFunc, ResErr } from '../../ts/metaTypes.ts';
import { INGEST_FILE_COLLECTION_ENTRY_TYPEDECL, COLLECTION_ENTRY_DTO_TYPEDECL, DBDSN_TYPEDECL, INGEST_FILE_COLLECTION_ASSET_TYPEDECL, INGEST_FILE_COLLECTION_FIELD_TYPEDECL, INGEST_FILE_SINGLE_ASSET_TYPEDECL, INGEST_FILE_SINGLE_ASSET_FIELD_TYPEDECL, TRANSFORM_DTO_TYPEDECL, type AutoIngestScript, type DBDSN, type IngestFileAssetEntry, type IngestFileCollectionAsset, type IngestFileSingleAsset, type TransformDTO, IngestFileAssetType, type IngestFileSettings, INGEST_FILE_SETTINGS_TYPEDECL, type SettingsSubFile, type AutoIngestSubScript } from '../../ts/types.ts';
import { checkIDRangesOfSubFiles, verifyIngestFile, verifyIngestFileAssets, verifySubFileIDAssignments } from './ingestFileVerifier.ts';

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
    context.logger.log("[if_cmd] Reading ingest file from: " + url);
    const {result, error} = await readIngestFile(url); if (error !== null) {
        context.logger.log("[if_cmd] Failed to read ingest file: \n\t" + error, LogLevel.FATAL);
        return {result: null, error: error};
    }
    context.logger.log("[if_cmd] Successfully read main ingest file.");
    context.logger.log("[if_cmd] Verifying ingest file.");
    const verificationResult = verifyIngestFile(result, context); if (verificationResult.error !== null) {
        context.logger.log("[if_cmd] Failed to verify ingest file: \n\t" + verificationResult.error, LogLevel.FATAL);
        return {result: null, error: verificationResult.error};
    }
    const ingestScript = verificationResult.result;
    context.logger.log("[if_cmd] Successfully verified main ingest file.");
    printSettingsToLog(ingestScript.settings, context);

    const subFileResult = await handleSubFiles(ingestScript.settings.subFiles, context); if (subFileResult.error !== null) {
        context.logger.log("[if_cmd] Failed to verify sub-files: \n\t" + subFileResult.error, LogLevel.FATAL);
        return {result: null, error: subFileResult.error};
    }

    return processIngestFile(ingestScript, context, subFileResult.result);
}


const printSettingsToLog = (settings: IngestFileSettings, context: ApplicationContext): void => {
    let constructedStringTable = "";
    for (const key of Object.keys(settings)) {
        if (key === "dsn") {
            constructedStringTable += "\n\t" + key + ": " + "{ xxxx xxxx xxxx xxxx }";
            continue;
        }
        constructedStringTable += "\n\t" + key + ": " + settings[key as keyof typeof settings];
    }
    context.logger.log("[if_cmd] Settings for file: " + constructedStringTable);
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
    To see an example of the ingest file format, run "bun devour.js help ingestFileFormat".
    `,
    abstractExample: "bun devour everything path=\"url\"",
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


const handleSubFiles = async (subFiles: SettingsSubFile[] | undefined, context: ApplicationContext): Promise<ResErr<AutoIngestSubScript[]>> => {
    if(!subFiles || subFiles.length <= 0){
        return {result: [], error: null};
    }
    const rangeCheckError = checkIDRangesOfSubFiles(subFiles, context); if (rangeCheckError) {
        context.logger.log("[if_cmd] Range check failed: " + rangeCheckError, LogLevel.ERROR);
        return {result: null, error: rangeCheckError};
    }
    const verifiedSubFiles: AutoIngestScript[] = [];
    for (const subFileDeclaration of subFiles) {
        const typeCheck = conformsToType(subFileDeclaration, INGEST_FILE_SETTINGS_TYPEDECL); if (typeCheck !== null) {
            context.logger.log("[if_cmd] Type error in sub-file declaration: " + typeCheck, LogLevel.ERROR);
            return {result: null, error: "Type error in sub-file declaration: " + typeCheck};
        }
        const url = subFileDeclaration.path;
        const {result, error} = await readIngestFile(url); if (error !== null) {
            context.logger.log("[if_cmd] Failed to read sub-file: " + url + "\n\t" + error, LogLevel.ERROR);
            return {result: null, error: error};
        }
        const verifyError = verifyIngestFileAssets(result, context); if (verifyError) {
            context.logger.log("[if_cmd] Failed to verify sub-file: " + url + "\n\t" + verifyError, LogLevel.ERROR);
            return {result: null, error: verifyError};
        }
        const idCheckError = verifySubFileIDAssignments(subFileDeclaration, result, context); if (idCheckError) {
            context.logger.log("[if_cmd] ID assignment error in sub-file: " + url + "\n\t" + idCheckError, LogLevel.ERROR);
            return {result: null, error: idCheckError};
        }
        const ingestScript = result;
        verifiedSubFiles.push(ingestScript);
    }
    return {result: verifiedSubFiles, error: null};
}