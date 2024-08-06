export type Error = string;

/**
 * CLI shortHand: "xOff yOff zIndex, xScale yScale", example: transform="0f 0f 0, 0f 0f"
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

export type AssetEntry = {
	id: number | undefined,
	transform: Transform, // internal relative to collection origo
	graphicalAssetId: number,
}
export type AssetEntryDTO  ={
    transform: TransformDTO,
    graphicalAssetId: number,
}

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
			type: "single" | "collection",
			useCase: "icon" | "environment" | "player",
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
	