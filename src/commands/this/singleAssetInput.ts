import {
    readAliasArg,
    readCompactDSNNotation,
    readCompactTransformNotation,
    readIDArg,
    readThresholdArg,
    readUrlArg,
    readUseCaseArg,
} from '../../processing/cliInputProcessor.ts';
import { type ApplicationContext, type CLIFunc, type ResErr } from '../../ts/metaTypes.ts';
import { UNIT_TRANSFORM, AssetUseCase, type DBDSN, type TransformDTO } from '../../ts/types.ts';
import { LogLevel } from '../../logging/simpleLogger.ts';
import { prepareSingleAssetForUpload, type TracableAssetEntry } from '../../processing/ingestProcessor.ts';
import { IngestFileAssetType, type IngestFileSettings, type IngestFileSingleAssetField } from '../../ts/ingestFileTypes.ts';

/**
 * @author GustavBW
 * @since 0.0.1
 */
const handleSingleAssetCLIInput = async (args: string[], context: ApplicationContext): Promise<ResErr<string>> => {
    context.logger.log('[sai cmd] Handling single asset input, args: ' + args.join(', '));
    let url: string | null = null;
    let useCase: AssetUseCase | null = null;
    let transform: TransformDTO | null = UNIT_TRANSFORM;
    let threshold: number | null = null;
    let dsn: DBDSN | null = null;
    let alias: string | null = null;
    let id: number | null = null;

    // Parse Args
    for (const arg of args) {
        if (arg.startsWith('id')) {
            const { result, error } = readIDArg(arg);
            if (error === null) {
                id = result;
            } else {
                context.logger.log(`[sai cmd] Error reading id: ${error}`);
                return { result: null, error: error };
            }
        }

        if (arg.startsWith('source')) {
            const { result, error } = readUrlArg(arg);
            if (error === null) {
                url = result;
            } else {
                context.logger.log(`[sai cmd] Error reading source: ${error}`);
                return { result: null, error: error };
            }
        }
        if (arg.startsWith('useCase')) {
            const { result, error } = readUseCaseArg(arg);
            if (error === null) {
                useCase = result;
            } else {
                context.logger.log(`[sai cmd] Error reading useCase: ${error}`);
                return { result: null, error: error };
            }
        }
        if (arg.startsWith('transform')) {
            const { result, error } = readCompactTransformNotation(arg);
            if (error === null) {
                transform = result;
            } else {
                context.logger.log(`[sai cmd] Error reading transform: ${error}`);
                return { result: null, error: error };
            }
        }
        if (arg.startsWith('threshold')) {
            const { result, error } = readThresholdArg(arg);
            if (error === null) {
                threshold = result;
            } else {
                context.logger.log(`[sai cmd] Error reading threshold: ${error}`);
                return { result: null, error: error };
            }
        }
        if (arg.startsWith('dsn')) {
            const { result, error } = readCompactDSNNotation(arg);
            if (error !== null) {
                context.logger.log(`[sai cmd] Error reading dsn: ${error}`);
                return Promise.resolve({ result: null, error: error });
            }
            dsn = result;
        }
        if (arg.startsWith('alias')) {
            const { result, error } = readAliasArg(arg);
            if (error !== null) {
                context.logger.log(`[sai cmd] Error reading alias: ${error}`);
                return { result: null, error: error };
            }
            alias = result;
        }
    }

    // Check Args
    if (id === null) {
        context.logger.log(`[sai cmd] No id provided.`, LogLevel.ERROR);
        return { result: null, error: 'No id provided.' };
    }
    if (url === null) {
        context.logger.log(`[sai cmd] No source provided, 'source="../../.."'.`, LogLevel.ERROR);
        return { result: null, error: 'No source url provided.' };
    }
    if (useCase === null) {
        context.logger.log(`[sai cmd] No useCase provided, defaulting to "environment".`, LogLevel.WARNING);
        useCase = AssetUseCase.ENVIRONMENT;
    }
    if (alias === null) {
        alias = url.split('/').pop()!;
        context.logger.log(`[sai cmd] No alias provided defaulting to url-based alias: ${alias}`, LogLevel.WARNING);
    }
    if (threshold === null) {
        threshold = 10;
        context.logger.log(`[sai cmd] No threshold provided, defaulting to ${threshold}KB.`, LogLevel.WARNING);
    }
    if (dsn === null) {
        context.logger.log(`[sai cmd] No dsn provided.`, LogLevel.ERROR);
        return { result: null, error: 'No dsn provided.' };
    }

    // Format to uniform format
    const settings: IngestFileSettings = {
        version: '0.0.1',
        dsn: dsn,
        LODThreshold: threshold,
        allowedFailures: 0,
        maxLOD: 0,
    };
    const singleAsset: TracableAssetEntry = {
        type: IngestFileAssetType.SINGLE,
        originFile: 'cli',
        useCase: useCase,
        single: {
            id: id,
            alias: alias,
            source: url,
            width: transform.xScale,
            height: transform.yScale,
        }
    };

    // Prepare for upload
    const preparationResult = await prepareSingleAssetForUpload(singleAsset, settings, useCase, context);
    if (preparationResult.error !== null) {
        context.logger.log(`[sai cmd] Error preparing asset for upload: ${preparationResult.error}`, LogLevel.ERROR);
        return { result: null, error: preparationResult.error };
    }
    const prepared = preparationResult.result;

    // Upload to DB
    const res = await context.db.instance.uploadAsset(prepared);
    if (res.error !== null) {
        context.logger.log(`[sai cmd] Error uploading asset: ${res.error}`, LogLevel.ERROR);
        return Promise.resolve({ result: null, error: res.error });
    }

    return Promise.resolve({ result: 'Success', error: null });
};

/**
 * @author GustavBW
 * @since 0.0.1
 */
export const SINGLE_ASSET_INPUT_CMD: CLIFunc<string> = {
    func: handleSingleAssetCLIInput,
    whatToDoWithResult: (result: string) => {
        console.log(result);
    },
    identifier: 'this',
    documentation: `
    Devours a single asset from the given source.
    The source may be an http url or a filepath.
    The transform is in order "xOffset yOffset zIndex, xScale yScale"
    The dsn is in order "host port, username password, dbName, sslMode"
    Width and height are in pixels and will be derived from retrieved asset if possible.
    Usecase defaults to "environment" if not provided.
    `,
    abstractExample:
        'bun devour this source="url" useCase="icon" | "environment" | "player"? transform="1 1 0, 1 1"? treshold="kb\'s"?  alias="nameOfFile"? dsn="host port, user password, dbName, sslMode"',
};
