import { anyOfConstants, optionalType, typedArray, typedTuple } from '../runtimeTypeChecker/type';
import { Type, type TypeDeclaration } from '../runtimeTypeChecker/superMetaTypes';
import { AssetUseCase, DBDSN_TYPEDECL, type DBDSN, type TransformDTO } from './types';
import Structure from '../runtimeTypeChecker/structure';

export enum IngestFileAssetType {
    SINGLE = "single",
    COLLECTION = "collection",
    UNKNOWN = "unknown",
}
export const assetTypeFromString = (str: string): IngestFileAssetType => {
    switch (str.toLowerCase()) {
        case IngestFileAssetType.SINGLE:
            return IngestFileAssetType.SINGLE;
        case IngestFileAssetType.COLLECTION:
            return IngestFileAssetType.COLLECTION;
        default:
            return IngestFileAssetType.UNKNOWN;
    }
}

// Define common fields
interface IngestFileAssetBase {
    type?: IngestFileAssetType;
    useCase: AssetUseCase;
}

// Define specific variants
export interface IngestFileSingleAsset extends IngestFileAssetBase {
    type: IngestFileAssetType.SINGLE;
    single: IngestFileSingleAssetField;
}
export const INGEST_FILE_SINGLE_ASSET_TYPEDECL: TypeDeclaration = {
    type: optionalType(anyOfConstants([IngestFileAssetType.SINGLE])),
    useCase: anyOfConstants(Object.values(AssetUseCase)),
    single: Type.OBJECT,
};
export type IngestFileSingleAssetField = {
    id: number;
    source: string;
    alias?: string;
    width?: number;
    height?: number;
};
export const INGEST_FILE_SINGLE_ASSET_FIELD_TYPEDECL: TypeDeclaration = {
    source: Type.STRING,
    id: Type.INTEGER,
    alias: optionalType(Type.STRING),
    width: optionalType(Type.INTEGER),
    height: optionalType(Type.INTEGER),
};

export const INGEST_FILE_COLLECTION_FIELD_TYPEDECL: TypeDeclaration = {
    entries: Type.ARRAY,
    name: Type.STRING,
    id: Type.INTEGER,
};

export interface IngestFileCollectionAsset extends IngestFileAssetBase {
    type: IngestFileAssetType.COLLECTION;
    useCase: AssetUseCase;
    collection: IngestFileCollectionField;
}
export const INGEST_FILE_COLLECTION_ASSET_TYPEDECL: TypeDeclaration = {
    type: optionalType(anyOfConstants([IngestFileAssetType.COLLECTION])),
    useCase: anyOfConstants(Object.values(AssetUseCase)),
    collection: Type.OBJECT,
};
export type CollectionEntryDTO = {
    transform: TransformDTO;
    /**
     * Id of existing graphical asset
     */
    graphicalAssetId: number;
};
export type IngestFileCollectionField = {
    name: string;
    id: number;
    entries: CollectionEntryDTO[];
};
export type SettingsSubFile = {
    path: string;
    assetIDRanges?: [number, number][];
    collectionIDRanges?: [number, number][];
};
export const INGEST_FILE_SUB_FILE_TYPEDECL: TypeDeclaration = Structure([
    Structure.atLeastOneOf({
        assetIDRanges: typedArray(typedTuple([Type.INTEGER, Type.INTEGER])),
        collectionIDRanges: typedArray(typedTuple([Type.INTEGER, Type.INTEGER])),
    })
])({
    path: Type.STRING,
});
// Create the discriminated union
export type IngestFileAssetEntry = IngestFileSingleAsset | IngestFileCollectionAsset;
export type IngestFileSettings = {
    version: string;
    maxLOD: number;
    LODThreshold: number;
    allowedFailures: number;
    dsn: DBDSN;
    subFiles?: SettingsSubFile[];
};
export const INGEST_FILE_SETTINGS_TYPEDECL: TypeDeclaration = {
    version: Type.STRING,
    maxLOD: Type.INTEGER,
    LODThreshold: Type.INTEGER,
    allowedFailures: Type.INTEGER,
    dsn: DBDSN_TYPEDECL,
    subFiles: optionalType(typedArray(INGEST_FILE_SUB_FILE_TYPEDECL)),
};
export interface AutoIngestSubScript {
    assets: IngestFileAssetEntry[];
}
export interface PreparedAutoIngestSubScript extends AutoIngestSubScript {
    path: string;
}
/**
 * @author GustavBW
 * @since 0.0.1
 */
export interface AutoIngestScript {
    settings: IngestFileSettings;
    assets: IngestFileAssetEntry[];
}
