import { optionalType, rangeOfConstants as anyOfConstants, typeUnionOR } from "../processing/typeChecker";
import { Type, type ImageMIMEType, type TypeDeclaration } from "./metaTypes";

/**
 * CLI shortHand: "xOff yOff zIndex, xScale yScale", example: transform="0f 0f 0, 0f 0f"
 * @author GustavBW
 * @since 0.0.1
 */
export type Transform = {
    /**
     * uint32
     */
	id: number | undefined,
     /**
     * float32
     */
	xOffset: number,
     /**
     * float32
     */
	yOffset: number,
     /**
     * uint32
     */
	zIndex: number,
     /**
     * float32
     */
	xScale: number, 
     /**
     * float32
     * duly note that the scale parameters take the	place of a width/height parameter if no such exist
     */
	yScale: number, 
}
export type TransformDTO = Omit<Transform, "id">;
export const TRANSFORM_DTO_TYPEDECL: TypeDeclaration = {
    id: optionalType(Type.INTEGER),
    xOffset: Type.FLOAT,
    yOffset: Type.FLOAT,
    zIndex: Type.INTEGER,
    xScale: Type.FLOAT,
    yScale: Type.FLOAT,
}
export const UNIT_TRANSFORM: Transform = { 
    id: undefined,
    xOffset: 0,
    yOffset: 0,
    zIndex: 0,
    xScale: 1,
    yScale: 1,
}
/**
 * @author GustavBW
 * @since 0.0.1
 */
export type CollectionEntry = {
	id: number | undefined,
	transform: Transform, // internal relative to collection origo
	graphicalAssetId: number,
}
/**
 * @author GustavBW
 * @since 0.0.1
 */

export const COLLECTION_ENTRY_DTO_TYPEDECL: TypeDeclaration = {
    transform: Type.OBJECT,
    graphicalAssetId: Type.INTEGER,
}
export const INGEST_FILE_COLLECTION_ENTRY_TYPEDECL: TypeDeclaration = {
    transform: typeUnionOR(Type.OBJECT, Type.STRING),
    graphicalAssetId: Type.INTEGER,
}
/**
 * Represents some graphical asset in varying levels of detail (downscaled) 
 * @author GustavBW
 * @since 0.0.1
 */
export type LODDTO = {
    /**
     * uint32
     * 0 is the highest level of detail
     * The level of detail/resolution of this given representation is a function: 1/2^detailLevel
     * (with each LOD level being half the resolution of the previous)
     */
    detailLevel: number,
    blob: Blob,
}

/**
 * @author GustavBW
 * @since 0.0.1
 */
export type AssetUseCase = "icon" | "environment" | "player";
export type AssetType = "single" | "collection";
export type DBDSN = {
    host: string,
    port: number,
    user: string,
    password: string,
    dbName: string,
    sslMode: string
}
export const DBDSN_TYPEDECL: TypeDeclaration = {
    host: Type.STRING,
    port: Type.INTEGER,
    user: Type.STRING,
    password: Type.STRING,
    dbName: Type.STRING,
    sslMode: optionalType(anyOfConstants(["require", "disable"])),
}

export type GraphicalAsset = {
	id: number,
	useCase: AssetUseCase,
	type: ImageMIMEType, //MIME type
	hasLODs: boolean,
	width: number,
	height: number,
    /** To be derived from blob url if not defined */
    alias: string | undefined,
	blob: Blob //Only available if "hasLODs" is false
}
export const GRAPHICAL_ASSET_TYPEDECL: TypeDeclaration = {
    id: Type.INTEGER,
    useCase: anyOfConstants(["icon", "environment", "player"]),
    type: anyOfConstants(["image/jpeg", "image/jpg", "image/avif", "image/tiff", "image/webp", "image/png", "image/gif", "image/svg+xml"]),
    hasLODs: Type.BOOLEAN,
    width: Type.INTEGER,
    height: Type.INTEGER,
    alias: optionalType(Type.STRING),
    blob: Type.OBJECT,
}
// Define common fields
interface IngestFileAssetBase {
    useCase: AssetUseCase;
}

// Define specific variants
export interface IngestFileSingleAsset extends IngestFileAssetBase {
    type: "single";
    single: IngestFileSingleAssetField;
}
export const INGEST_FILE_SINGLE_ASSET_TYPEDECL: TypeDeclaration = {
    type: anyOfConstants(["single"]),
    useCase: anyOfConstants(["icon", "environment", "player"]),
    single: Type.OBJECT,
}
export type IngestFileSingleAssetField = {
    id: number;
    source: string;
    alias?: string;
    width?: number;
    height?: number;
}
export const INGEST_FILE_SINGLE_ASSET_FIELD_TYPEDECL: TypeDeclaration = {
    source: Type.STRING,
    id: Type.INTEGER,
    alias: optionalType(Type.STRING),
    width: optionalType(Type.INTEGER),
    height: optionalType(Type.INTEGER),
}

export const INGEST_FILE_COLLECTION_FIELD_TYPEDECL: TypeDeclaration = {
    entries: Type.ARRAY,
    name: Type.STRING,
}

export interface IngestFileCollectionAsset extends IngestFileAssetBase {
    type: "collection";
    useCase: AssetUseCase;
    collection: IngestFileCollectionField;
}
export const INGEST_FILE_COLLECTION_ASSET_TYPEDECL: TypeDeclaration = {
    type: anyOfConstants(["collection"]),
    useCase: anyOfConstants(["icon", "environment", "player"]),
    collection: Type.OBJECT,
}
export type CollectionEntryDTO = {
    transform: TransformDTO,
    /**
     * Id of existing graphical asset
     */
    graphicalAssetId: number,
}
export type IngestFileCollectionField = {
    name: string;
    entries: CollectionEntryDTO[],
}

// Create the discriminated union
export type IngestFileAssetEntry = IngestFileSingleAsset | IngestFileCollectionAsset;
export type IngestFileSettings = {
    version: string,
    maxLOD: number,
    LODThreshold: number,
    allowedFailures: number,
    dsn: DBDSN,
}
/**
 * @author GustavBW
 * @since 0.0.1
 */
export type AutoIngestScript = {
	settings: IngestFileSettings,
	assets: IngestFileAssetEntry[]
}
	