import type { AssetUseCase, TransformDTO } from '../ts/types.ts';
import type { Error, ResErr } from '../ts/metaTypes.ts';
import { isValidNumber, isValidUrl } from './typeChecker.ts';

export const readUrlArg = (arg: string): ResErr<string> => {
    let url = arg.split("=")[1].replaceAll("\"", "").trim();
    if(!isValidUrl(url)) {
        return {result: null, error: "Invalid source url"}
    }
    return {result: url, error: null};
}

export const readUseCaseArg = (arg: string): ResErr<AssetUseCase> => {
    const useCaseStr = arg.split("=")[1].replaceAll("\"", "").trim();
    let useCase: AssetUseCase;
    switch (useCaseStr) {
        case "icon": useCase = "icon"; break;
        case "environment": useCase = "environment"; break;
        case "player": useCase = "player"; break;
        default: return {result: null, error: "Invalid useCase argument"}
    }
    return {result: useCase, error: null};
}

export const readThresholdArg = (arg: string): ResErr<number> => {
    const thresholdStr = arg.split("=")[1].replaceAll("\"", "").trim();
    const threshold = parseInt(thresholdStr);
    if (isValidNumber(threshold)) {
        return {result: threshold, error: null};
    }
    return {result: null, error: "Invalid threshold argument"};
}

export const readCompactTransformNotation = (arg: string): {result: TransformDTO | null, error: Error | null} => {
    // Expect: transform="0 0 0, 0 0"
    const parts = arg.split('=');
    if (parts.length !== 2) {
        return {result: null, error: "Invalid transform notation"};
    }
    const dataPart = parts[1].replaceAll("\"", "");
    if (dataPart.length <= 9) {
        return {result: null, error: "Invalid transform data"};
    }
    const [xyzStr, scaleStr] = dataPart.split(',');
    const xyz = xyzStr.trim().split(" ");
    if (xyz.length !== 3) {
        return {result: null, error: "Invalid transform xyz component"};
    }
    const scale = scaleStr.trim().split(" ");
    if (scale.length !== 2) {
        return {result: null, error: "Invalid transform scale component"};
    }
    const xOffset = parseFloat(xyz[0]);
    if (!isValidNumber(xOffset)) {
        return {result: null, error: "Invalid transform x offset"};
    }
    const yOffset = parseFloat(xyz[1]);
    if (!isValidNumber(yOffset)) {
        return {result: null, error: "Invalid transform y offset"};
    }
    const zIndex = parseInt(xyz[2]);
    if (!isValidNumber(zIndex)) {
        return {result: null, error: "Invalid transform z index"};
    }
    const xScale = parseFloat(scale[0]);
    if (!isValidNumber(xScale)) {
        return {result: null, error: "Invalid transform x scale"};
    }
    const yScale = parseFloat(scale[1]);
    if (!isValidNumber(yScale)) {
        return {result: null, error: "Invalid transform y scale"};
    }
    return {
        result: {
            xOffset,
            yOffset,
            zIndex,
            xScale,
            yScale,
        },
        error: null,
    }
}