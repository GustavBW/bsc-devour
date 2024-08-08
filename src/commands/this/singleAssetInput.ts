import { fetchBlobFromUrl } from '../../networking/blobFetcher.ts';
import { readCompactTransformNotation, readThresholdArg, readUrlArg, readUseCaseArg } from '../../processing/cliInputProcessor.ts';
import type { CLIFunc, ResErr } from '../../ts/metaTypes.ts';
import { UNIT_TRANSFORM, type AssetUseCase, type TransformDTO } from '../../ts/types.ts';

/**
 * @author GustavBW
 * @since 0.0.1
 */
const handleSingleAssetCLIInput = (args: string[]): Promise<ResErr<string>> => {
    let url: string
    let useCase: AssetUseCase
    let transform: TransformDTO | null = UNIT_TRANSFORM
    let threshold: number | null = 1000 
    for (const arg of args) {
        if (arg.startsWith("source")){
            const {result, error} = readUrlArg(arg);
            if (error === null) { url = result; }
            else { return Promise.resolve({result: null, error: error}); }
        }
        if (arg.startsWith("useCase")){
            const {result, error} = readUseCaseArg(arg);
            if (error === null) { useCase = result; }
            else { return Promise.resolve({result: null, error: error}); }
        }
        if (arg.startsWith("transform")){
            const {result, error} = readCompactTransformNotation(arg);
            if (error === null) { transform = result; }
            else { return Promise.resolve({result: null, error: error}); }
        }
        if (arg.startsWith("threshold")){
            const {result, error} = readThresholdArg(arg);
            if (error === null) { threshold = result; }
            else { return Promise.resolve({result: null, error: error}); }
        }
    }

    return Promise.resolve({result: null, error: "Not implemented yet."});
}

export const devourSingleAsset = async (url: string, useCase: AssetUseCase, transform: TransformDTO, threshold: number): Promise<ResErr<string>> => {
    const {result, error} = await fetchBlobFromUrl(url);
    if (error !== null) {
        return Promise.resolve({result: null, error: error});
    }

    return {result: "NotImplemented", error: null};
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
    The transform is order "xOffset yOffset zIndex, xScale yScale"
    `,
    abstractExample: "node devour this source=\"url\" useCase=\"icon\" | \"environment\" | \"player\" transform=\"1 1 0, 1 1\" treshold=\"kb's\"",
}

