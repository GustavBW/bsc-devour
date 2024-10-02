import { test, expect } from 'bun:test';
import { readUrlArg, readUseCaseArg, readThresholdArg, readCompactTransformNotation, readCompactDSNNotation } from './cliInputProcessor';
import { AssetUseCase } from '../ts/types';

test('readUrlArg valid URL', () => {
    const result = readUrlArg('url="https://example.com"');
    expect(result).toEqual({ result: 'https://example.com', error: null });
});

test('readUrlArg invalid URL', () => {
    const result = readUrlArg('url=""');
    expect(result).toEqual({ result: null, error: 'Invalid source url' });
});

test('readUseCaseArg valid useCase icon', () => {
    const result = readUseCaseArg('useCase="icon"');
    expect(result).toEqual({ result: AssetUseCase.ICON, error: null });
});

test('readUseCaseArg invalid useCase', () => {
    const result = readUseCaseArg('useCase="invalid"');
    expect(result).toEqual({ result: null, error: 'Invalid useCase argument' });
});

test('readThresholdArg valid threshold', () => {
    const result = readThresholdArg('threshold="10"');
    expect(result).toEqual({ result: 10, error: null });
});

test('readThresholdArg invalid threshold', () => {
    const result = readThresholdArg('threshold="invalid"');
    expect(result).toEqual({ result: null, error: 'Invalid threshold argument' });
});

test('readCompactTransformNotation valid notation', () => {
    const result = readCompactTransformNotation('transform="0 0 0, 0 0"');
    expect(result).toEqual({
        result: {
            xOffset: 0,
            yOffset: 0,
            zIndex: 0,
            xScale: 0,
            yScale: 0,
        },
        error: null,
    });
});

test('readCompactTransformNotation invalid notation length', () => {
    const result = readCompactTransformNotation('transform="0 0 0, 0"');
    expect(result).toEqual({ result: null, error: 'Invalid transform data' });
});

test('readCompactTransformNotation invalid xyz component', () => {
    const result = readCompactTransformNotation('transform="0 0, 0 0"');
    expect(result).toEqual({ result: null, error: 'Invalid transform data' });
});

test('readCompactTransformNotation invalid scale component', () => {
    const result = readCompactTransformNotation('transform="0 0 0, 0"');
    expect(result).toEqual({ result: null, error: 'Invalid transform data' });
});

test('readCompactDSNNotation should return a valid DBDSN object for correct notation', () => {
    const input = 'dsn="localhost 5432, user password, mydb, require"';
    const expected = {
        result: {
            host: 'localhost',
            port: 5432,
            user: 'user',
            password: 'password',
            dbName: 'mydb',
            sslMode: 'require',
        },
        error: null,
    };

    const result = readCompactDSNNotation(input);
    expect(result).toEqual(expected);
});

test('readCompactDSNNotation should return an error if DSN is not correctly formatted', () => {
    const input = 'dsn="localhost 5432, user password, mydb"'; // Missing sslMode
    const expected = { result: null, error: 'Wrong number of comma separated segments in DSN' };

    const result = readCompactDSNNotation(input);
    expect(result).toEqual(expected);
});

test('readCompactDSNNotation should return an error for invalid port number', () => {
    const input = 'dsn="localhost notANumber, user password, mydb, require"';
    const expected = { result: null, error: 'Invalid port in DSN' };

    const result = readCompactDSNNotation(input);
    expect(result).toEqual(expected);
});

test('readCompactDSNNotation should return an error if missing host or port', () => {
    const input = 'dsn="localhost, user password, mydb, require"';
    const expected = { result: null, error: 'Missing either host or port in DSN' };

    const result = readCompactDSNNotation(input);
    expect(result).toEqual(expected);
});

test('readCompactDSNNotation should return an error if missing user or password', () => {
    const input = 'dsn="localhost 5432, user, mydb, require"';
    const expected = { result: null, error: 'Missing either user or password in DSN' };

    const result = readCompactDSNNotation(input);
    expect(result).toEqual(expected);
});

test("readCompactDSNNotation should return an error if input does not contain '='", () => {
    const input = 'dsn"localhost 5432, user password, mydb, require"';
    const expected = { result: null, error: 'Invalid DSN notation' };

    const result = readCompactDSNNotation(input);
    expect(result).toEqual(expected);
});
