import {test, expect} from 'bun:test';
import {assureUniformTransform, assureUniformDSN, validateCollectionAssetEntry, validateSingleAssetEntry, verifyIngestFile} from './ingestFileInput';
import type { IngestFileCollectionAsset } from '../../ts/types';

test("Test file exists", async () => {
    const file = Bun.file("src/assets/testData/testIngestFile.json");
    const fileExists = await file.exists();
    expect(fileExists).toBe(true);
    expect(file.type).toBe("application/json;charset=utf-8");
    expect(file.size).toBeGreaterThan(0);
});

//Tests of "assureUniformTransform"
test("assureUniformTransform should return valid TransformDTO on valid compact CLI notation input", async () => {
    const result = assureUniformTransform("1 2 3, 4 5");
    expect(result.error).toBeNull();
    expect(result.result).toEqual({xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5});
});

test("assureUniformTransform should return error on invalid compact CLI notation input", async () => {
    const result = assureUniformTransform("1 2 3, 4");
    expect(result.error).not.toBeNull();
    expect(result.error).not.toBeUndefined();
    expect(result.result).toBeNull();
});

test("assureUniformTransform should return valid TransformDTO on valid object input", async () => {
    const result = assureUniformTransform({xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5});
    expect(result.error).toBeNull();
    expect(result.result).toEqual({xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5});
});

test("assureUniformTransform should return error on invalid object input", async () => {
    const result = assureUniformTransform({xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4} as any);
    expect(result.error).not.toBeNull();
    expect(result.error).not.toBeUndefined();
    expect(result.result).toBeNull();
});

//Tests of "assureUniformDSN"
test("assureUniformDSN should return valid DSN on valid compact cli notation input", async () => {
    const result = assureUniformDSN("host 3423, username password, dbName, sslMode");
    expect(result.error).toBeNull();
    expect(result.result).toEqual({host: "host", port: 3423, user: "username", password: "password", dbName: "dbName", sslMode: "sslMode"});
});

test("assureUniformDSN should return error on invalid compact cli notation input", async () => {
    const result = assureUniformDSN("host 3423, username password, dbName");
    expect(result.error).not.toBeNull();
    expect(result.error).not.toBeUndefined();
    expect(result.result).toBeNull();
});

test("assureUniformDSN should return valid DSN on valid object input", async () => {
    const result = assureUniformDSN({host: "host", port: 3423, user: "username", password: "password", dbName: "dbName", sslMode: "sslMode"});
    expect(result.error).toBeNull();
    expect(result.result).toEqual({host: "host", port: 3423, user: "username", password: "password", dbName: "dbName", sslMode: "sslMode"});
});

test("assureUniformDSN should default sslMode to \"disable\" on missing declaration", async () => {
    const result = assureUniformDSN({host: "host", port: 3423, user: "username", password: "password", dbName: "dbName"} as any);
    expect(result.error).toBeNull();
    expect(result.result).toEqual({host: "host", port: 3423, user: "username", password: "password", dbName: "dbName", sslMode: "disable"});
});

test("assureUniformDSN should return error on invalid object input", async () => {
    const result = assureUniformDSN({host: "host", port: "3423a", user: "username", password: "password", dbName: "dbName", sslMode: "require"} as any);
    expect(result.error).not.toBeNull();
    expect(result.error).not.toBeUndefined();
    expect(result.result).toBeNull();
});

//Tests of "validateCollectionAssetEntry"
test("validateCollectionAssetEntry should return null on valid input", async () => {
    const collectionAsset: any = {
        type: "collection",
        useCase: "icon",
        id: 1,
        collection: {
            name: "SomeNameHere",
            sources: [{
                transform: {xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5},
                graphicalAssetId: 1,
            }],
        },
    };
    const error = validateCollectionAssetEntry(collectionAsset, 0);
    expect(error).toBeNull();
});

test("validateCollectionAssetEntry should return error on missing type field", async () => {
    const collectionAsset: any = {
        useCase: "icon",
        id: 1,
        collection: {
            name: "true",
            sources: [{
                transform: {xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5},
                graphicalAssetId: 1,
            }],
        },
    };
    const error = validateCollectionAssetEntry(collectionAsset, 0);
    expect(error).not.toBeNull();
    expect(error).not.toBeUndefined();
});

//Tests of "validateSingleAssetEntry"


//Tests of "verifyIngestFile"


//Tests of "readIngestFile"


