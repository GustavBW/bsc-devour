
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

/**
 * @author GustavBW
 * @since 0.0.1
 */
export type AutoIngestScript = {
	settings: {
		version: string | undefined, // assumes newest
        /**
         * uint32 - default 0 - any amount
         */
		maxLOD: number | undefined,
        /**
         * uint32 - default 0 - num. kilobytes
         */
		LODThreshhold: number | undefined,
        /**
         * int32 - default 0 - num. allowed failures
         */
		allowedFailures: number | undefined,
		dsn: {
			host: string,
			port: number,
			user: string,
			password: string,
			dbName: string,
			sslMode: string
		},
	},
	assets: [
		{
			type: AssetType,
			useCase: AssetUseCase,
            /**
             * if single
             */
			source: string | undefined, 			
            /**
             * uint32 - if single
             */
			width: number | undefined, 			
            /**
             * uint32 - if single
             */
			height: number | undefined, 

            /**
             * if collection
             */
			sources: AssetEntryDTO[] | undefined, 	
             /**
             * if collection
             */
			transform: TransformDTO | undefined,
             /**
             * if collection
             */
			name: string | undefined,
		}
	]
}
	