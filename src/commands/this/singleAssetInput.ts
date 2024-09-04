import type sharp from 'sharp';
import { fetchBlobFromUrl } from '../../networking/blobFetcher.ts';
import { readAliasArg, readCompactDSNNotation, readCompactTransformNotation, readIDArg, readThresholdArg, readUrlArg, readUseCaseArg } from '../../processing/cliInputProcessor.ts';
import { getMetaDataAsIfImage } from '../../processing/imageUtil.ts';
import { findConformingMIMEType } from '../../processing/typeChecker.ts';
import { IMAGE_TYPES, type ApplicationContext, type CLIFunc, type ResErr } from '../../ts/metaTypes.ts';
import { UNIT_TRANSFORM, type AssetUseCase, type AutoIngestScript, type DBDSN, type TransformDTO } from '../../ts/types.ts';
import { generateLODs } from '../../processing/lodGenerator.ts';
import { LogLevel } from '../../logging/simpleLogger.ts';

/**
 * @author GustavBW
 * @since 0.0.1
 */
const handleSingleAssetCLIInput = async (args: string[], context: ApplicationContext): Promise<ResErr<string>> => {
    context.logger.log("Handling single asset input, args: " + args.join(", "));
    let url: string | null = null;
    let useCase: AssetUseCase | null = null;
    let transform: TransformDTO | null = UNIT_TRANSFORM;
    let threshold: number | null = null;
    let dsn: DBDSN | null = null;
    let alias: string | null = null;
    let id: number | null = null;

    for (const arg of args) {
        if (arg.startsWith("id")){
            const {result, error} = readIDArg(arg);
            if (error === null) { id = result; }
            else {
                context.logger.log(`Error reading id: ${error}`); 
                return {result: null, error: error}; 
            }
        }

        if (arg.startsWith("source")){
            const {result, error} = readUrlArg(arg);
            if (error === null) { url = result; }
            else {
                context.logger.log(`Error reading source: ${error}`); 
                return {result: null, error: error}; 
            }
        }
        if (arg.startsWith("useCase")){
            const {result, error} = readUseCaseArg(arg);
            if (error === null) { useCase = result; }
            else {
                context.logger.log(`Error reading useCase: ${error}`); 
                return {result: null, error: error}; 
            }
        }
        if (arg.startsWith("transform")){
            const {result, error} = readCompactTransformNotation(arg);
            if (error === null) { transform = result; }
            else { 
                context.logger.log(`Error reading transform: ${error}`);
                return {result: null, error: error}; 
            }
        }
        if (arg.startsWith("threshold")){
            const {result, error} = readThresholdArg(arg);
            if (error === null) { threshold = result; }
            else { 
                context.logger.log(`Error reading threshold: ${error}`);
                return {result: null, error: error}; 
            }
        }
        if (arg.startsWith("dsn")){
            const {result, error} = readCompactDSNNotation(arg);
            if (error !== null) {
                context.logger.log(`Error reading dsn: ${error}`);
                return Promise.resolve({result: null, error: error});
            }
            dsn = result;
        }
        if (arg.startsWith("alias")){
            const {result, error} = readAliasArg(arg);
            if (error !== null) {
                context.logger.log(`Error reading alias: ${error}`);
                return {result: null, error: error};
            }
            alias = result;
        }
    }

    if (id === null) {
        context.logger.log(`No id provided.`, LogLevel.ERROR);
        return {result: null, error: "No id provided."};
    }
    if (url === null) {
        context.logger.log(`No source provided, 'source="../../.."'.`, LogLevel.ERROR);
        return {result: null, error: "No source url provided."};
    }
    if (useCase === null) {
        context.logger.log(`No useCase provided, defaulting to "environment".`, LogLevel.WARNING);
        useCase = "environment";
    }
    if (alias === null) {
        alias = url.split("/").pop()!;
        context.logger.log(`No alias provided defaulting to url-based alias: ${alias}`, LogLevel.WARNING);
    }
    if (threshold === null) {
        threshold = 10;
        context.logger.log(`No threshold provided, defaulting to ${threshold}KB.`, LogLevel.WARNING);
    }
    if (dsn === null) {
        context.logger.log(`No dsn provided.`, LogLevel.ERROR);
        return {result: null, error: "No dsn provided."};
    }

    const asIngestFile: AutoIngestScript = {
        settings: {
            version: "0.0.1",
            dsn: dsn,
            LODThreshold: threshold,
            allowedFailures: 0,
            maxLOD: 0,
        },
        assets: [
            {
                type: "single",
                useCase: useCase,
                single: {
                    id: id,
                    alias: alias,
                    source: url,
                }
            }
        ]
    }
    
    // Connect to DB
    const err = await context.db.connect(dsn, context);
    if (err !== null) {
        context.logger.log(`Error connecting to DB: ${err}`, LogLevel.ERROR);
        return Promise.resolve({result: null, error: err});
    }

    const {result, error} = await fetchBlobFromUrl(url, context); if (error !== null) {
        context.logger.log(`Error fetching blob from url ${url}: ${error}`, LogLevel.ERROR);
        return {result: null, error: error};
    }
    const blob = result;
    const contentTypeRes = findConformingMIMEType(blob.type); if (contentTypeRes.error !== null) {
        context.logger.log(`Error determining MIME type for blob: ${contentTypeRes.error}`, LogLevel.ERROR);
        return {result: null, error: contentTypeRes.error};
    }
    const isSVG = contentTypeRes.result === IMAGE_TYPES.svg[0];
    let metadataRelevant = false;
    let metadata: sharp.Metadata;
    if (isSVG) { // SVG TRANSFORM CASE
        if (transform === UNIT_TRANSFORM || (transform.xScale <= 1 && transform.yScale <= 1)) {
            return {result: null, error: "SVGs must have a transform with non 1 xScale and yScale as they make up the needed width and height properties in this case."};
        }
    }else{
        const {result, error} = await getMetaDataAsIfImage(blob, context); if (error !== null) {
            context.logger.log(`Error getting metadata from image: ${error}`, LogLevel.ERROR);
            return {result: null, error: error};
        }
        metadataRelevant = true;
        metadata = result;
    }

    // Generate LODs
    const lods = await generateLODs(blob, threshold!); if (lods.error !== null) {
        context.logger.log(`Error generating LODs: ${lods.error}`, LogLevel.ERROR);
        return {result: null, error: lods.error};
    }

    // Upload to DB
    const res = await context.db.instance.uploadAsset({
        id: id,
        width: metadataRelevant ? metadata!.width! * transform.xScale : transform.xScale,
        height: metadataRelevant ? metadata!.height! * transform.yScale : transform.yScale,
        useCase: useCase,
        type: contentTypeRes.result!,
        alias: alias,
        lods: lods.result!,
    });
    if (res.error !== null) {
        context.logger.log(`Error uploading asset: ${res.error}`, LogLevel.ERROR);
        return Promise.resolve({result: null, error: res.error});
    }
    
    return Promise.resolve({result: "Success", error: null});
}

/**
 * @author GustavBW
 * @since 0.0.1
 */
export const SINGLE_ASSET_INPUT_CMD: CLIFunc<string> = {
    func: handleSingleAssetCLIInput,
    whatToDoWithResult: (result: string) => {
        console.log(result);
    },
    identifier: "this",
    documentation: `
    Devours a single asset from the given source.
    The source may be an http url or a filepath.
    The transform is in order "xOffset yOffset zIndex, xScale yScale"
    The dsn is in order "host port, username password, dbName, sslMode"
    Width and height are in pixels and will be derived from retrieved asset if possible.
    Usecase defaults to "environment" if not provided.
    `,
    abstractExample: "bun devour this source=\"url\" useCase=\"icon\" | \"environment\" | \"player\"? transform=\"1 1 0, 1 1\"? treshold=\"kb's\"?  alias=\"nameOfFile\"? dsn=\"host port, user password, dbName, sslMode\"",
}

