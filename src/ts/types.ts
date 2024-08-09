
/**
 * CLI shortHand: "xOff yOff zIndex, xScale yScale", example: transform="0f 0f 0, 0f 0f"
 * @author GustavBW
 * @since 0.0.1
 */
export type Transform = {
    /**
     * uint32
     */
	"id": number | undefined,
     /**
     * float32
     */
	"xOffset": number,
     /**
     * float32
     */
	"yOffset": number,
     /**
     * uint32
     */
	"zIndex": number,
     /**
     * float32
     */
	"xScale": number, 
     /**
     * float32
     * duly note that the scale parameters take the	place of a width/height parameter if no such exist
     */
	"yScale": number, 
}
export type TransformDTO = Omit<Transform, "id">;
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
export type AssetEntry = {
	id: number | undefined,
	transform: Transform, // internal relative to collection origo
	graphicalAssetId: number,
}
/**
 * @author GustavBW
 * @since 0.0.1
 */
export type AssetEntryDTO  ={
    transform: TransformDTO,
    /**
     * Id of existing graphical asset
     */
    graphicalAssetId: number,
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

export type ImageMIMEType = "image/jpeg" | "image/jpg" | "image/avif" | "image/tiff" | "image/webp" | "image/png" | "image/gif" | "image/bmp" | "image/svg+xml";

export type GraphicAsset = {
	id: number,
	useCase: AssetUseCase,
	type: ImageMIMEType, //MIME type
	hasLODs: boolean,
	width: number,
	height: number,
	blob: Blob //Only available if "hasLODs" is false
}
// Define common fields
interface IngestFileAssetBase {
    useCase: AssetUseCase;
}

// Define specific variants
export interface IngestFileSingleAsset extends IngestFileAssetBase {
    type: "single";
    single: {
        id: number;
        source?: string;
        width?: number;
        height?: number;
    };
}

export interface IngestFileCollectionAsset extends IngestFileAssetBase {
    type: "collection";
    collection: {
        id: number;
        sources?: AssetEntryDTO[];
        transform?: TransformDTO;
        name?: string;
    };
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
	