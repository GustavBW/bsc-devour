import { LogLevel } from '../../logging/simpleLogger';
import { readUrlArg } from '../../processing/cliInputProcessor';
import { processIngestFile } from '../../processing/ingestProcessor';
import { joinOmitSeperatorOnLast } from '../../runtimeTypeChecker/arrayUtil.ts';
import { conformsToType } from '../../runtimeTypeChecker/type.ts';
import {
    INGEST_FILE_SUB_FILE_TYPEDECL,
    type AutoIngestSubScript,
    type IngestFileSettings,
    type PreparedAutoIngestSubScript,
    type SettingsSubFile,
} from '../../ts/ingestFileTypes';
import type { ApplicationContext, CLIFunc, ResErr } from '../../ts/metaTypes';
import { checkIDRangesAndPathsOfSubFiles, verifyIngestFile, verifyIngestFileAssets, verifySubFileIDAssignments } from './ingestFileVerifier.ts';

/**
 * @author GustavBW
 * @since 0.0.1
 */
const handleIngestFileInput = async (args: string[], context: ApplicationContext): Promise<ResErr<string>> => {
    let url = '';
    for (const arg of args) {
        if (arg.startsWith('path=')) {
            const { result, error } = readUrlArg(arg);
            if (error !== null) {
                return { result: null, error: error };
            }
            url = result;
        }
    }

    if (url === '') {
        return { result: null, error: 'No path argument provided' };
    }
    context.logger.log('[if_cmd] Reading ingest file from: ' + url);
    const { result, error } = await readIngestFile(url);
    if (error !== null) {
        context.logger.log('[if_cmd] Failed to read ingest file: \n\t' + error, LogLevel.FATAL);
        return { result: null, error: "Error in file: " + url + ": " + error };
    }
    context.logger.log('[if_cmd] Successfully read main ingest file.');
    context.logger.logAndPrint('[if_cmd] Verifying main ingest file.');
    const verificationResult = verifyIngestFile(result, context);
    if (verificationResult.error !== null) {
        context.logger.log('[if_cmd] Failed to verify ingest file ' + url + ': \n\t' + verificationResult.error, LogLevel.FATAL);
        return { result: null, error: "Error in file: " + url + ": " + verificationResult.error };
    }
    const ingestScript = verificationResult.result;
    context.logger.log('[if_cmd] Successfully verified main ingest file.');
    printSettingsToLog(ingestScript.settings, context);

    const subFileResult = await handleSubFiles(ingestScript.settings.subFiles, context);
    if (subFileResult.error !== null) {
        context.logger.log('[if_cmd] Failed to handle sub-files: \n\t' + subFileResult.error, LogLevel.FATAL);
        return { result: null, error: "Error in file: " + url + ": " + subFileResult.error };
    }

    return processIngestFile(ingestScript, context, subFileResult.result);
};

const printSettingsToLog = (settings: IngestFileSettings, context: ApplicationContext): void => {
    let constructedStringTable = '';
    for (const key of Object.keys(settings)) {
        if (key === 'dsn') {
            constructedStringTable += '\n\t' + key + ': ' + '{ xxxx xxxx xxxx xxxx }';
        } else if (key === 'subFiles') {
            constructedStringTable += '\n\t' + key + ': ' + settings.subFiles!.map((subFile: SettingsSubFile) => subFile.path).join(', ');
        } else {
            constructedStringTable += '\n\t' + key + ': ' + settings[key as keyof typeof settings];
        }
    }
    context.logger.log('[if_cmd] Settings for file: ' + constructedStringTable);
};
/**
 * @author GustavBW
 * @since 0.0.1
 */
export const INGEST_FILE_INPUT_CMD: CLIFunc<string> = {
    func: handleIngestFileInput,
    whatToDoWithResult: (result: string) => {
        console.log(result);
    },
    identifier: 'everything',
    documentation: `
    Devours all assets specified in the file according to the given settings.
    The source may be an http url or a filepath.
    To see an example of the ingest file format, run "bun devour.js help ingestFileFormat".
    `,
    abstractExample: 'bun devour everything path="url"',
};

/**
 * Read the file as a string. Then parse as JSON. No type checks so far
 * @author GustavBW
 * @since 0.0.1
 */
export const readIngestFile = async (url: string): Promise<ResErr<any>> => {
    const file = Bun.file(url);
    const fileExists = await file.exists();
    if (!fileExists) {
        return {
            result: null,
            error: 'File: "' + url + '" does not exist. WD: ' + import.meta.dir,
        };
    }
    const fileContents = await file.text();
    let ingestScript: any;
    try {
        ingestScript = JSON.parse(fileContents);
    } catch (error) {
        return { result: null, error: 'Failed to parse IngestFile: ' + error };
    }

    return { result: ingestScript, error: null };
};

const handleSubFiles = async (
    subFiles: SettingsSubFile[] | undefined,
    context: ApplicationContext,
): Promise<ResErr<PreparedAutoIngestSubScript[]>> => {
    if (!subFiles || subFiles.length <= 0) {
        return { result: [], error: null };
    }
    const rangeCheckError = checkIDRangesAndPathsOfSubFiles(subFiles, context);
    if (rangeCheckError) {
        context.logger.log('[if_cmd] Range check failed: ' + rangeCheckError, LogLevel.ERROR);
        return { result: null, error: rangeCheckError };
    }
    const verifiedSubFiles: PreparedAutoIngestSubScript[] = [];
    const results = (await Promise.all(subFiles.map(async (subFileDeclaration) => {
        context.logger.logAndPrint('[if_cmd] Verifying sub-file: ' + subFileDeclaration.path);
        const typeCheckError = conformsToType(subFileDeclaration, INGEST_FILE_SUB_FILE_TYPEDECL);
        if (typeCheckError !== null) {
            context.logger.log('[if_cmd] Type error in sub-file declaration: ' + typeCheckError, LogLevel.ERROR);
            return { result: null, error: 'Type error in sub-file: ' + subFileDeclaration.path + typeCheckError };
        }
        const url = subFileDeclaration.path;
        const { result, error } = await readIngestFile(url);
        if (error !== null) {
            context.logger.log('[if_cmd] Failed to read sub-file: ' + url + '\n\t' + error, LogLevel.ERROR);
            return { result: null, error: 'Failed to read sub-file: ' + url + ": " + error };
        }
        const verifyError = verifyIngestFileAssets(result.assets, context);
        if (verifyError) {
            context.logger.log('[if_cmd] Failed to verify sub-file: ' + url + '\n\t' + verifyError, LogLevel.ERROR);
            return { result: null, error: 'Failed to verify sub-file: ' + url + ": " + verifyError };
        }
        const idCheckError = verifySubFileIDAssignments(subFileDeclaration, result, context);
        if (idCheckError) {
            context.logger.log('[if_cmd] ID assignment error in sub-file: ' + url + '\n\t' + idCheckError, LogLevel.ERROR);
            return { result: null, error: 'ID assignment error in sub-file: ' + url + ": " + idCheckError };
        }
        const ingestScript = result as AutoIngestSubScript;
        return {
            result: {
                path: subFileDeclaration.path,
                assets: ingestScript.assets,
            }, error: null
        };
    })));

    const errors = [];
    for (const res of results) {
        if (res.error !== null) {
            errors.push(res.error);
        } else {
            verifiedSubFiles.push(res.result);
        }
    }

    if (errors.length > 0) {
        return { result: null, error: 'Errors in sub-files: ' + joinOmitSeperatorOnLast(errors, ', ') };
    }

    return { result: verifiedSubFiles, error: null };
};
