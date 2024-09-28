import {test, expect} from 'bun:test';
import {readIngestFile} from './ingestFileInput';
import { AssetUseCase, IngestFileAssetType, type IngestFileCollectionAsset, type IngestFileSingleAsset } from '../../ts/types';
import type { BunFile } from 'bun';
import { assureUniformDSN, assureUniformTransform, validateCollectionAssetEntry, validateSingleAssetEntry, verifyIngestFile } from './ingestFileVerifier';

//Tests of "readIngestFile"
let testFileJson: any;
test("Test file exists", async () => {
    const {result, error} = await readIngestFile("src/assets/testData/testIngestFile.json");
    expect(error).toBeNull();
    testFileJson = result;
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
    const result = assureUniformDSN({host: "host", port: 3423, user: "username", password: "password", dbName: "dbName", sslMode: "require"});
    expect(result.error).toBeNull();
    expect(result.result).toEqual({host: "host", port: 3423, user: "username", password: "password", dbName: "dbName", sslMode: "require"});
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
        collection: {
            id: 1,
            name: "SomeNameHere",
            entries: [{
                transform: {xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5},
                graphicalAssetId: 1,
            }],
            transform: "1 2 3, 4 5",
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
            entries: [{
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
test("validateSingleAssetEntry should return null on valid input", async () => {
    const singleAsset: IngestFileSingleAsset = {
        type: IngestFileAssetType.SINGLE,
        useCase: AssetUseCase.ICON,
        single: {
            id: 1,
            source: "https://http.cat/images/100.jpg",
            alias: "YallNeverGuessThisOne",
            width: 100,
            height: 100,
        },
    };
    const error = validateSingleAssetEntry(singleAsset, 0);
    expect(error).toBeNull();

    const singleAsset2: IngestFileSingleAsset = {
        type: IngestFileAssetType.SINGLE,
        useCase: AssetUseCase.ICON,
        single: {
            id: 1,
            source: "https://http.cat/images/100.jpg",
            alias: "YallNeverGuessThisOneEither",
        },
    };
    const error2 = validateSingleAssetEntry(singleAsset2, 0);
    expect(error2).toBeNull();
});


//Tests of "verifyIngestFile"
test("verifyIngestFile should return null on valid input", async () => {
    const res = verifyIngestFile(testFileJson);
    expect(res.error).toBeNull();
});

