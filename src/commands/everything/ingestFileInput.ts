import { readUrlArg } from '../../processing/cliInputProcessor.ts';
import type { ApplicationContext, CLIFunc, ResErr } from '../../ts/metaTypes.ts';
import type { AutoIngestScript, IngestFileAssetEntry, IngestFileCollectionAsset, IngestFileSingleAsset } from '../../ts/types.ts';


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

    const {result, error} = await parseIngestFile(url); if (error !== null) {
        return {result: null, error: error};
    }
    console.log(result);

    return {result: null, error: "Not implemented yet."};
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

const validateCollectionAssetEntry = (asset: IngestFileCollectionAsset, entryNum: number): string | null => {
    if (asset.collection === undefined || asset.collection === null) {
        return "No collection field found in collection asset nr:" + entryNum;
    }
    if (asset.collection.id === undefined || asset.collection.id === null) {
        return "No id field found in collection asset nr:" + entryNum;
    }
    if (asset.collection.sources === undefined || asset.collection.sources === null) {
        return "No sources field found in collection asset nr:" + entryNum;
    }
    if (!Array.isArray(asset.collection.sources) || asset.collection.sources.length === 0) {
        return "Sources field in collection asset nr:" + entryNum + " is not an array or is an empty array.";
    }
    return null;
}

const validateSingleAssetEntry = (asset: IngestFileSingleAsset, entryNum: number): string | null => {
    if (asset.single === undefined || asset.single === null) {
        return "No single field found in single asset nr:" + entryNum;
    }
    if (asset.single.id === undefined || asset.single.id === null) {
        return "No id field found in single asset nr:" + entryNum ;
    }
    if (asset.single.source === undefined || asset.single.source === null) {
        return "No source field found in single asset nr:" + entryNum;
    }
    return null;
}
/**
 * Read the file as a string. Parse the json. Then check the type
 * @author GustavBW
 * @since 0.0.1
 */
const parseIngestFile = async (url: string): Promise<ResErr<AutoIngestScript>> => {
    const file = Bun.file(url);
    const fileExists = await file.exists();
    if (!fileExists) {
        return { result: null, error: "File: \""+url+"\" does not exist. WD: " + import.meta.dir };
    }
    const fileContents = await file.text();
    let ingestScript: AutoIngestScript;
    try {
        ingestScript = JSON.parse(fileContents);
    } catch (error) {
        return { result: null, error: "Failed to parse IngestFile: " + error };
    }

    if (ingestScript.settings === undefined || ingestScript.settings === null) {
        return { result: null, error: "No settings field and corresponding object found in ingest file." };
    }

    if (ingestScript.settings.dsn === undefined || ingestScript.settings.dsn === null) {
        return { result: null, error: "No dsn field found in ingest file under settings." };
    }

    if (ingestScript.assets === undefined || ingestScript.assets === null) {
        return { result: null, error: "No assets field and corresponding object found in ingest file." };
    }

    if (!Array.isArray(ingestScript.assets) || ingestScript.assets.length === 0) {
        return { result: null, error: "Assets field in ingest file is not an array or is an empty array." };
    }

    for (let i = 0; i < ingestScript.assets.length; i++) {
        const asset = ingestScript.assets[i];
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

    return {result: ingestScript, error: null};
}