import { test, expect } from 'bun:test';
import { readIngestFile } from './ingestFileInput';
import { AssetUseCase } from '../../ts/types';
import {
    assureUniformDSN,
    assureUniformTransform,
    checkIDRangesAndPathsOfSubFiles,
    validateCollectionAssetEntry,
    validateSingleAssetEntry,
    verifyIngestFile,
    verifyIngestFileAssets,
    verifyIngestFileSettings,
    verifySubFileIDAssignments,
} from './ingestFileVerifier';
import { IngestFileAssetType, type AutoIngestSubScript, type IngestFileAssetEntry, type IngestFileSingleAsset, type SettingsSubFile } from '../../ts/ingestFileTypes';

//Tests of "readIngestFile"
let testFileJson: any;
test('Test file exists', async () => {
    const { result, error } = await readIngestFile('src/assets/testData/testIngestFile.json');
    expect(error).toBeNull();
    testFileJson = result;
});

//Tests of "assureUniformTransform"
test('assureUniformTransform should return valid TransformDTO on valid compact CLI notation input', async () => {
    const result = assureUniformTransform('1 2 3, 4 5');
    expect(result.error).toBeNull();
    expect(result.result).toEqual({ xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5 });
});

test('assureUniformTransform should return error on invalid compact CLI notation input', async () => {
    const result = assureUniformTransform('1 2 3, 4');
    expect(result.error).not.toBeNull();
    expect(result.error).not.toBeUndefined();
    expect(result.result).toBeNull();
});

test('assureUniformTransform should return valid TransformDTO on valid object input', async () => {
    const result = assureUniformTransform({
        xOffset: 1,
        yOffset: 2,
        zIndex: 3,
        xScale: 4,
        yScale: 5,
    });
    expect(result.error).toBeNull();
    expect(result.result).toEqual({ xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5 });
});

test('assureUniformTransform should return error on invalid object input', async () => {
    const result = assureUniformTransform({ xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4 } as any);
    expect(result.error).not.toBeNull();
    expect(result.error).not.toBeUndefined();
    expect(result.result).toBeNull();
});

//Tests of "assureUniformDSN"
test('assureUniformDSN should return valid DSN on valid compact cli notation input', async () => {
    const result = assureUniformDSN('host 3423, username password, dbName, sslMode');
    expect(result.error).toBeNull();
    expect(result.result).toEqual({
        host: 'host',
        port: 3423,
        user: 'username',
        password: 'password',
        dbName: 'dbName',
        sslMode: 'sslMode',
    });
});

test('assureUniformDSN should return error on invalid compact cli notation input', async () => {
    const result = assureUniformDSN('host 3423, username password, dbName');
    expect(result.error).not.toBeNull();
    expect(result.error).not.toBeUndefined();
    expect(result.result).toBeNull();
});

test('assureUniformDSN should return valid DSN on valid object input', async () => {
    const result = assureUniformDSN({
        host: 'host',
        port: 3423,
        user: 'username',
        password: 'password',
        dbName: 'dbName',
        sslMode: 'require',
    });
    expect(result.error).toBeNull();
    expect(result.result).toEqual({
        host: 'host',
        port: 3423,
        user: 'username',
        password: 'password',
        dbName: 'dbName',
        sslMode: 'require',
    });
});

test('assureUniformDSN should default sslMode to "disable" on missing declaration', async () => {
    const result = assureUniformDSN({
        host: 'host',
        port: 3423,
        user: 'username',
        password: 'password',
        dbName: 'dbName',
    } as any);
    expect(result.error).toBeNull();
    expect(result.result).toEqual({
        host: 'host',
        port: 3423,
        user: 'username',
        password: 'password',
        dbName: 'dbName',
        sslMode: 'disable',
    });
});

test('assureUniformDSN should return error on invalid object input', async () => {
    const result = assureUniformDSN({
        host: 'host',
        port: '3423a',
        user: 'username',
        password: 'password',
        dbName: 'dbName',
        sslMode: 'require',
    } as any);
    expect(result.error).not.toBeNull();
    expect(result.error).not.toBeUndefined();
    expect(result.result).toBeNull();
});

//Tests of "validateCollectionAssetEntry"
test('validateCollectionAssetEntry should return null on valid input', async () => {
    const collectionAsset: any = {
        type: 'collection',
        useCase: 'icon',
        collection: {
            id: 1,
            name: 'SomeNameHere',
            entries: [
                {
                    transform: { xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5 },
                    graphicalAssetId: 1,
                },
            ],
        },
    };
    const error = validateCollectionAssetEntry(collectionAsset, 0);
    expect(error).toBeNull();
});

test('validateCollectionAssetEntry should return error on missing type field', async () => {
    const collectionAsset: any = {
        useCase: 'icon',
        id: 1,
        collection: {
            name: 'true',
            entries: [
                {
                    transform: { xOffset: 1, yOffset: 2, zIndex: 3, xScale: 4, yScale: 5 },
                    graphicalAssetId: 1,
                },
            ],
        },
    };
    const error = validateCollectionAssetEntry(collectionAsset, 0);
    expect(error).not.toBeNull();
    expect(error).not.toBeUndefined();
});

//Tests of "validateSingleAssetEntry"
test('validateSingleAssetEntry should return null on valid input', async () => {
    const singleAsset: IngestFileSingleAsset = {
        type: IngestFileAssetType.SINGLE,
        useCase: AssetUseCase.ICON,
        single: {
            id: 1,
            source: 'https://http.cat/images/100.jpg',
            alias: 'YallNeverGuessThisOne',
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
            source: 'https://http.cat/images/100.jpg',
            alias: 'YallNeverGuessThisOneEither',
        },
    };
    const error2 = validateSingleAssetEntry(singleAsset2, 0);
    expect(error2).toBeNull();
});

//Tests of "verifyIngestFile"
test('verifyIngestFile settings should return null on valid input', async () => {
    const error = verifyIngestFileSettings(testFileJson.settings);
    expect(error).toBeUndefined();
});

test('verifyIngestFile assets should return null on valid input', async () => {
    const error = verifyIngestFileAssets(testFileJson.assets);
    expect(error).toBeUndefined();
});

test('verifyIngestFile assets should allow for no explicit type', async () => {
    const testAssets: IngestFileAssetEntry[] = [
        {
            useCase: AssetUseCase.ICON,
            single: {
                id: 1,
                source: 'https://http.cat/images/100.jpg',
                alias: 'YallNeverGuessThisOne',
                width: 100,
                height: 100,
            },
        } as any,
    ]
    const error = verifyIngestFileAssets(testAssets);
    expect(error).toBeUndefined();
})

test('verifyIngestFile assets shouldnt allow for "unknown" as type, even though it is part of backing enum', async () => {
    const testAssets: IngestFileAssetEntry[] = [
        {
            type: IngestFileAssetType.UNKNOWN, 
            useCase: AssetUseCase.ICON,
            unknown: {
                id: 1,
                source: 'https://http.cat/images/100.jpg',
                alias: 'YallNeverGuessThisOne',
                width: 100,
                height: 100,
            },
        } as any,
    ]
    const error = verifyIngestFileAssets(testAssets);
    expect(error).not.toBeUndefined();
})

test('verifyIngestFile assets should still accept explicit type', async () => {
    const testAssets: IngestFileAssetEntry[] = [
        {
            type: IngestFileAssetType.SINGLE, 
            useCase: AssetUseCase.ICON,
            single: {
                id: 1,
                source: 'https://http.cat/images/100.jpg',
                alias: 'YallNeverGuessThisOne',
                width: 100,
                height: 100,
            },
        } as any,
    ]
    const error = verifyIngestFileAssets(testAssets);
    expect(error).toBeUndefined();
})

test('verifyIngestFile should return error on missing settings field', async () => {
    const res = verifyIngestFile({ assets: [] });
    expect(res.error).not.toBeNull();
    expect(res.error).not.toBeUndefined();
});

test('verifySubFileIDAssignments should return undefined on valid input', async () => {
    const testSubFile: SettingsSubFile = {
        path: 'somePathPathIsNotVerifiedInThisFunction',
        assetIDRanges: [
            [1, 10],
            [20, 30],
        ],
    };
    const testScript: AutoIngestSubScript = {
        assets: [],
    };
    const error = verifySubFileIDAssignments(testSubFile, testScript);
    expect(error).toBeUndefined();
});

test('verifySubFileIDAssignments with unknown asset type', () => {
    const subFile: SettingsSubFile = {
        path: 'test.json',
        assetIDRanges: [[1, 10]],
    };
    const script: AutoIngestSubScript = {
        assets: [
            {
                type: IngestFileAssetType.UNKNOWN,
                useCase: 'icon',
            } as any,
        ],
    };

    const result = verifySubFileIDAssignments(subFile, script);
    expect(result).toEqual('Unknown asset type in sub-file. Unable to verify ID assignment.');
});

test('verifySubFileIDAssignments with multiple ID ranges', () => {
    const subFile: SettingsSubFile = {
        path: 'test.json',
        assetIDRanges: [
            [1, 10],
            [20, 30],
        ],
    };
    const script: AutoIngestSubScript = {
        assets: [
            {
                type: IngestFileAssetType.SINGLE,
                useCase: AssetUseCase.ICON,
                single: { id: 5, source: 'test1.png' },
            },
            {
                type: IngestFileAssetType.COLLECTION,
                useCase: AssetUseCase.ICON,
                collection: { id: 25, name: 'testCollection', entries: [] },
            },
        ],
    };

    const result = verifySubFileIDAssignments(subFile, script);
    expect(result).toBeUndefined();
});

test('verifySubFileIDAssignments with invalid collection asset ID', () => {
    const subFile: SettingsSubFile = {
        path: 'test.json',
        assetIDRanges: [[1, 10]],
    };
    const script: AutoIngestSubScript = {
        assets: [
            {
                type: IngestFileAssetType.COLLECTION,
                useCase: AssetUseCase.ICON,
                collection: { id: 0, name: 'testCollection', entries: [] },
            },
        ],
    };

    const result = verifySubFileIDAssignments(subFile, script);
    expect(result).not.toBeUndefined();
    expect(result!.length).toBeGreaterThan('ID 15 in sub-file test.json is not within assigned id ranges'.length);
});

test('verifySubFileIDAssignments with invalid single asset ID', () => {
    const subFile: SettingsSubFile = {
        path: 'test.json',
        assetIDRanges: [[1, 10]],
    };
    const script: AutoIngestSubScript = {
        assets: [
            {
                type: IngestFileAssetType.SINGLE,
                useCase: AssetUseCase.ICON,
                single: { id: 15, source: 'test.png' },
            },
        ],
    };

    const result = verifySubFileIDAssignments(subFile, script);
    expect(result).not.toBeUndefined();
    expect(result!.length).toBeGreaterThan('ID 15 in sub-file test.json is not within assigned id ranges'.length);
});

test('verifySubFileIDAssignments with valid collection asset', () => {
    const subFile: SettingsSubFile = {
        path: 'test.json',
        assetIDRanges: [[1, 10]],
    };
    const script: AutoIngestSubScript = {
        assets: [
            {
                type: IngestFileAssetType.COLLECTION,
                useCase: AssetUseCase.ICON,
                collection: { id: 7, name: 'testCollection', entries: [] },
            },
        ],
    };

    const result = verifySubFileIDAssignments(subFile, script);
    expect(result).toBeUndefined();
});

test('verifySubFileIDAssignments with valid single asset', () => {
    const subFile: SettingsSubFile = {
        path: 'test.json',
        assetIDRanges: [[1, 10]],
    };
    const script: AutoIngestSubScript = {
        assets: [
            {
                type: IngestFileAssetType.SINGLE,
                useCase: AssetUseCase.ICON,
                single: { id: 5, source: 'test.png' },
            },
        ],
    };

    const result = verifySubFileIDAssignments(subFile, script);
    expect(result).toBeUndefined();
});

test('checkIDRangesOfSubFiles with non-overlapping ranges', () => {
    const subFiles: SettingsSubFile[] = [
        {
            path: 'file1.json',
            assetIDRanges: [
                [1, 10],
                [20, 30],
            ],
        },
        {
            path: 'file2.json',
            assetIDRanges: [
                [40, 50],
                [60, 70],
            ],
        },
    ];

    const result = checkIDRangesAndPathsOfSubFiles(subFiles);
    expect(result).toBeUndefined();
});

test('checkIDRangesOfSubFiles with overlapping ranges between files', () => {
    const subFiles: SettingsSubFile[] = [
        {
            path: 'file1.json',
            assetIDRanges: [
                [1, 10],
                [20, 30],
            ],
        },
        {
            path: 'file2.json',
            assetIDRanges: [
                [25, 35],
                [40, 50],
            ],
        },
    ];

    const result = checkIDRangesAndPathsOfSubFiles(subFiles);
    expect(result).not.toBeUndefined();
    expect(result!.length).toBeGreaterThan('ID range overlap between sub-file 0 and 1'.length);
});

test('checkIDRangesOfSubFiles with duplicate paths', () => {
    const subFiles: SettingsSubFile[] = [
        { path: 'file1.json', assetIDRanges: [[1, 10]] },
        { path: 'file1.json', assetIDRanges: [[20, 30]] },
    ];

    const result = checkIDRangesAndPathsOfSubFiles(subFiles);
    expect(result).not.toBeUndefined();
    expect(result!.length).toBeGreaterThan('Duplicate path in sub-files 0 and 1'.length);
});

test('checkIDRangesOfSubFiles with overlapping ranges within the same file - which is okay', () => {
    const subFiles: SettingsSubFile[] = [
        {
            path: 'file1.json',
            assetIDRanges: [
                [1, 10],
                [5, 15],
            ],
        },
    ];

    const result = checkIDRangesAndPathsOfSubFiles(subFiles);
    expect(result).toBeUndefined();
});

test('checkIDRangesOfSubFiles with multiple files and various scenarios', () => {
    const subFiles: SettingsSubFile[] = [
        {
            path: 'file1.json',
            assetIDRanges: [
                [1, 10],
                [20, 30],
            ],
        },
        { path: 'file2.json', assetIDRanges: [[40, 50]] },
        {
            path: 'file3.json',
            assetIDRanges: [
                [60, 70],
                [80, 90],
            ],
        },
        { path: 'file4.json', assetIDRanges: [[100, 110]] },
    ];

    const result = checkIDRangesAndPathsOfSubFiles(subFiles);
    expect(result).toBeUndefined();
});
