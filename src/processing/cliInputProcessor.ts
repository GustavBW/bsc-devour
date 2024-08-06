import type { TransformDTO, Error } from '../ts/types.ts';
import { isValidNumber } from './typeChecker.ts';


export const readCompactTransformNotation = (arg: string): {transform: TransformDTO | null, error: Error | null} => {
    // Expect: transform="0f 0f 0, 0f 0f"
    const parts = arg.split(',');
    if (parts.length !== 2) {
        return {transform: null, error: "Invalid transform notation"};
    }
    const dataPart = parts[1].replaceAll("\"", "");
    if (dataPart.length <= 9) {
        return {transform: null, error: "Invalid transform data"};
    }
    const [xyzStr, scaleStr] = dataPart.split(',');
    const xyz = xyzStr.trim().split(" ");
    if (xyz.length !== 3) {
        return {transform: null, error: "Invalid transform xyz component"};
    }
    const scale = scaleStr.trim().split(" ");
    if (scale.length !== 2) {
        return {transform: null, error: "Invalid transform scale component"};
    }
    const xOffset = parseFloat(xyz[0]);
    if (isValidNumber(xOffset)) {
        return {transform: null, error: "Invalid transform x offset"};
    }
    const yOffset = parseFloat(xyz[1]);
    if (isValidNumber(yOffset)) {
        return {transform: null, error: "Invalid transform y offset"};
    }
    const zIndex = parseInt(xyz[2]);
    if (isValidNumber(zIndex)) {
        return {transform: null, error: "Invalid transform z index"};
    }
    const xScale = parseFloat(scale[0]);
    if (isValidNumber(xScale)) {
        return {transform: null, error: "Invalid transform x scale"};
    }
    const yScale = parseFloat(scale[1]);
    if (isValidNumber(yScale)) {
        return {transform: null, error: "Invalid transform y scale"};
    }
    return {
        transform: {
            xOffset,
            yOffset,
            zIndex,
            xScale,
            yScale,
        },
        error: null,
    }
}