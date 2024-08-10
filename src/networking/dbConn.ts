// Some postgresql connector here. 

import type { ApplicationContext, ResErr } from "../ts/metaTypes";
import type { AssetUseCase, DBDSN, ImageMIMEType, LODDTO } from "../ts/types";

export type DBConnection = unknown;
export type UploadableAsset = {
    id?: number,
    lods: LODDTO[],
    width: number,
	height: number,
    useCase: AssetUseCase,
	type: ImageMIMEType, //MIME type
}

const uploadSingleLODAsset = (assert: UploadableAsset, conn: DBConnection): ResErr<string> => {

    return {result: null, error: "Not implemented ya daft knob"};
}

const uploadMultiLODAsset = (assert: UploadableAsset, conn: DBConnection): ResErr<string> => {
    //Insert scaffold into GraphicAsset
    //upsert (insert or update) into GraphicAsset (id, useCase, type, hasLODs, width, height, blob) values (asset.id, asset.useCase, asset.type, true, asset.width, asset.height, null)

    //Insert LODs into LODs
    //for (const lod of asset.lods) {
    //    insert into LODs (graphicalAsset, detailLevel, blob) values (asset.id, lod.detailLevel, lod.blob)
    //}
    //insert into LODs (graphicalAsset, detailLevel, blob) values (asset.id, lod.detailLevel, lod.blob)
    return {result: null, error: "Not implemented ya daft knob"};
}

export const uploadLODs = (asset: UploadableAsset, conn: DBConnection, context: ApplicationContext): ResErr<string> => {
    if (asset.lods.length === 0) {
        return { result: null, error: "There must be at least 1 LOD" };
    }
    if (asset.id !== undefined) {
        const clearResult = clearExistingContent(asset.id, context);
    }

    const hasLODS = asset.lods.length > 1;
    
    //Delete existing LODs of former asset (if any)
    //delete * from LODs where graphicalAsset = asset.id


    return {result: null, error: "Not implemented ya daft knob"};
}
type ClearResult = {
    lodsRemoved: number, 
    aliasOfFormer: string
}
const clearExistingContent = (graphicalAssetId: number, context: ApplicationContext): ClearResult => {
    //select COUNT(*) from LODs where graphicalAsset = asset.id; delete * from LODs where graphicalAsset = asset.id
    //select alias from GraphicAsset where id = asset.id
    //delete * from GraphicAsset where id = asset.id
    //return {lodsRemoved: lodsRemoved, aliasOfFormer: aliasOfFormer}
    return {lodsRemoved: 0, aliasOfFormer: "Not implemented"};
}