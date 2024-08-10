import { fetchBlobFromUrl } from '../../networking/blobFetcher.ts';
import { readCompactDSNNotation, readCompactTransformNotation, readThresholdArg, readUrlArg, readUseCaseArg } from '../../processing/cliInputProcessor.ts';
import { getMetaDataAsIfImage } from '../../processing/imageUtil.ts';
import { findConformingMIMEType } from '../../processing/typeChecker.ts';
import { IMAGE_TYPES, type ApplicationContext, type CLIFunc, type ResErr } from '../../ts/metaTypes.ts';
import { UNIT_TRANSFORM, type AssetUseCase, type DBDSN, type TransformDTO } from '../../ts/types.ts';

/**
 * @author GustavBW
 * @since 0.0.1
 */
const handleSingleAssetCLIInput = async (args: string[], context: ApplicationContext): Promise<ResErr<string>> => {
    context.logger.log("Handling single asset input, args: " + args.join(", "));
    let url: string | null = null;
    let useCase: AssetUseCase | null = null;
    let transform: TransformDTO | null = UNIT_TRANSFORM;
    let threshold: number | null = 1000;
    let dsn: DBDSN | null = null;
    for (const arg of args) {
        if (arg.startsWith("source")){
            const {result, error} = readUrlArg(arg);
            if (error === null) { url = result; }
            else {
                context.logger.log(`Error reading source: ${error}`); 
                return Promise.resolve({result: null, error: error}); 
            }
        }
        if (arg.startsWith("useCase")){
            const {result, error} = readUseCaseArg(arg);
            if (error === null) { useCase = result; }
            else {
                context.logger.log(`Error reading useCase: ${error}`); 
                return Promise.resolve({result: null, error: error}); 
            }
        }
        if (arg.startsWith("transform")){
            const {result, error} = readCompactTransformNotation(arg);
            if (error === null) { transform = result; }
            else { 
                context.logger.log(`Error reading transform: ${error}`);
                return Promise.resolve({result: null, error: error}); 
            }
        }
        if (arg.startsWith("threshold")){
            const {result, error} = readThresholdArg(arg);
            if (error === null) { threshold = result; }
            else { 
                context.logger.log(`Error reading threshold: ${error}`);
                return Promise.resolve({result: null, error: error}); 
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
    }

    if (url === null) {
        context.logger.log(`No source url provided.`);
        return Promise.resolve({result: null, error: "No source url provided."});
    }
    if (useCase === null) {
        context.logger.log(`No use case provided, defaulting to "environment".`);
        useCase = "environment";
    }
    const {result, error} = await fetchBlobFromUrl(url, context); if (error !== null) {
        context.logger.log(`Error fetching blob from url ${url}: ${error}`);
        return {result: null, error: error};
    }
    const contentTypeRes = findConformingMIMEType(result.type); if (contentTypeRes.error !== null) {
        context.logger.log(`Error determining MIME type for blob: ${contentTypeRes.error}`);
        return {result: null, error: contentTypeRes.error};
    }
    if (contentTypeRes.result! === IMAGE_TYPES.svg[0]) {
        if (transform === UNIT_TRANSFORM || (transform.xScale <= 1 && transform.yScale <= 1)) {
            return {result: null, error: "SVGs must have a transform with non 1 xScale and yScale as they make up the needed width and height properties in this case."};
        }
    }


    return Promise.resolve({result: null, error: "Not implemented yet."});
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
    abstractExample: "bun devour this source=\"url\" useCase=\"icon\" | \"environment\" | \"player\" transform=\"1 1 0, 1 1\" treshold=\"kb's\" dsn=\"host port, user password, dbName, sslMode\"",
}

