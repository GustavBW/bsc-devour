import { AssetUseCase, type DBDSN, type TransformDTO } from '../ts/types';
import type { Error, ResErr } from '../ts/metaTypes';
import { isValidInteger, isValidNumber, isValidUrl } from '../runtimeTypeChecker/type';

export const readIDArg = (arg: string): ResErr<number> => {
    const idStrSplit = arg.split('=');
    if (idStrSplit.length !== 2) {
        return { result: null, error: 'Missing segment in id argument' };
    }
    const valueStr = idStrSplit[1].replaceAll('"', '').trim();
    const id = parseInt(valueStr);
    if (!isValidInteger(id)) {
        return { result: null, error: 'Invalid id value' };
    }
    return { result: id, error: null };
};

export const readUrlArg = (arg: string): ResErr<string> => {
    let url = arg.split('=')[1].replaceAll('"', '').trim();
    if (!isValidUrl(url)) {
        return { result: null, error: 'Invalid source url' };
    }
    return { result: url, error: null };
};

export const readUseCaseArg = (arg: string): ResErr<AssetUseCase> => {
    const useCaseStr = arg.split('=')[1].replaceAll('"', '').trim();
    let useCase: AssetUseCase;
    switch (useCaseStr) {
        case 'icon':
            useCase = AssetUseCase.ICON;
            break;
        case 'environment':
            useCase = AssetUseCase.ENVIRONMENT;
            break;
        case 'player':
            useCase = AssetUseCase.PLAYER;
            break;
        default:
            return { result: null, error: 'Invalid useCase argument' };
    }
    return { result: useCase, error: null };
};

export const readAliasArg = (arg: string): ResErr<string> => {
    const split = arg.split('=');
    if (split.length !== 2) {
        return { result: null, error: 'Invalid alias argument' };
    }
    return { result: split[1].replaceAll('"', '').trim(), error: null };
};

export const readThresholdArg = (arg: string): ResErr<number> => {
    const thresholdStr = arg.split('=')[1].replaceAll('"', '').trim();
    const threshold = parseInt(thresholdStr);
    if (isValidNumber(threshold)) {
        return { result: threshold, error: null };
    }
    return { result: null, error: 'Invalid threshold argument' };
};

/**
 * Expects: host port, user password, dbName, sslMode
 * @since 0.0.1
 * @author GustavBW
 * @returns Either a DBDSN or an error
 */
export const readCompactDSNNotationRaw = (arg: string): ResErr<DBDSN> => {
    const data = arg.split(',');
    if (data.length !== 4) {
        return { result: null, error: 'Wrong number of comma separated segments in DSN' };
    }
    const hostAndPort = data[0].trim().split(' ');
    if (hostAndPort.length !== 2) {
        return { result: null, error: 'Missing either host or port in DSN' };
    }
    const host = hostAndPort[0].trim();
    const port = parseInt(hostAndPort[1].trim());
    if (!isValidNumber(port)) {
        return { result: null, error: 'Invalid port in DSN' };
    }
    const userAndPassword = data[1].trim().split(' ');
    if (userAndPassword.length !== 2) {
        return { result: null, error: 'Missing either user or password in DSN' };
    }
    const user = userAndPassword[0].trim();
    const password = userAndPassword[1].trim();
    const dbName = data[2].trim();
    const sslMode = data[3].trim();
    return {
        result: {
            host,
            port,
            user,
            password,
            dbName,
            sslMode,
        },
        error: null,
    };
};

/**
 * Expects: dsn="host port, user password, dbName, sslMode"
 * @since 0.0.1
 * @author GustavBW
 * @returns Either a DBDSN or an error
 */
export const readCompactDSNNotation = (arg: string): ResErr<DBDSN> => {
    //Expect dsn="host port, user password, dbName, sslMode"
    const parts = arg.split('=');
    if (parts.length !== 2) {
        return { result: null, error: 'Invalid DSN notation' };
    }
    const dataPart = parts[1].replaceAll('"', '');
    return readCompactDSNNotationRaw(dataPart);
};

/**
 * Expects: 0 0 0, 0 0
 * @since 0.0.1
 * @author GustavBW
 * @returns Either a TransformDTO or an error
 */
export const readCompactTransformNotationRaw = (arg: string): ResErr<TransformDTO> => {
    const [xyzStr, scaleStr] = arg.split(',');
    const xyz = xyzStr.trim().split(' ');
    if (xyz.length !== 3) {
        return { result: null, error: 'Invalid transform xyz component' };
    }
    const scale = scaleStr.trim().split(' ');
    if (scale.length !== 2) {
        return { result: null, error: 'Invalid transform scale component' };
    }
    const xOffset = parseFloat(xyz[0]);
    if (!isValidNumber(xOffset)) {
        return { result: null, error: 'Invalid transform x offset' };
    }
    const yOffset = parseFloat(xyz[1]);
    if (!isValidNumber(yOffset)) {
        return { result: null, error: 'Invalid transform y offset' };
    }
    const zIndex = parseInt(xyz[2]);
    if (!isValidNumber(zIndex)) {
        return { result: null, error: 'Invalid transform z index' };
    }
    const xScale = parseFloat(scale[0]);
    if (!isValidNumber(xScale)) {
        return { result: null, error: 'Invalid transform x scale' };
    }
    const yScale = parseFloat(scale[1]);
    if (!isValidNumber(yScale)) {
        return { result: null, error: 'Invalid transform y scale' };
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
    };
};
/**
 * Expects: transform="0 0 0, 0 0"
 * @since 0.0.1
 * @author GustavBW
 * @returns Either a TransformDTO or an error
 */
export const readCompactTransformNotation = (arg: string): ResErr<TransformDTO> => {
    // Expect: transform="0 0 0, 0 0"
    const parts = arg.split('=');
    if (parts.length !== 2) {
        return { result: null, error: 'Invalid transform notation' };
    }
    const dataPart = parts[1].replaceAll('"', '');
    if (dataPart.length <= 9) {
        return { result: null, error: 'Invalid transform data' };
    }
    return readCompactTransformNotationRaw(dataPart);
};
