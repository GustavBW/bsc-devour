// Some postgresql connector here. 

import type { ApplicationContext, ImageMIMEType, ResErr } from "../ts/metaTypes";
import type { AssetUseCase, DBDSN, LODDTO } from "../ts/types";


export type UploadableAsset = {
    id?: number,
    lods: LODDTO[],
    width: number,
	height: number,
    useCase: AssetUseCase,
	type: ImageMIMEType, //MIME type
}

const uploadSingleLODAsset = (assert: UploadableAsset, conn: DB): ResErr<string> => {

    return {result: null, error: "Not implemented ya daft knob"};
}

const uploadMultiLODAsset = (assert: UploadableAsset, conn: DB): ResErr<string> => {
    //Insert scaffold into GraphicAsset
    //upsert (insert or update) into GraphicAsset (id, useCase, type, hasLODs, width, height, blob) values (asset.id, asset.useCase, asset.type, true, asset.width, asset.height, null)

    //Insert LODs into LODs
    //for (const lod of asset.lods) {
    //    insert into LODs (graphicalAsset, detailLevel, blob) values (asset.id, lod.detailLevel, lod.blob)
    //}
    //insert into LODs (graphicalAsset, detailLevel, blob) values (asset.id, lod.detailLevel, lod.blob)
    return {result: null, error: "Not implemented ya daft knob"};
}

export const _uploadAsset = (asset: UploadableAsset, context: ApplicationContext, conn: DBConnection): ResErr<string> => {
    context.logger.log("Uploading asset id: " + JSON.stringify(asset));
    if (asset.lods.length === 0) {
        context.logger.log("Asset did not have at least 1 LOD");
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

const connectDB = (dsn: DBDSN, context: ApplicationContext): void => {
    context.logger.log(`Connecting to database, host: ${dsn.host}, port: ${dsn.port}, name: ${dsn.dbName}, credentials: ${dsn.user} ****`);
    //Connect here
    const connection = null;
    DB_SINGLETON.instance = {
        dsn: dsn,
        uploadAsset: (uploadableAsset) => _uploadAsset(uploadableAsset, context, connection),
    }
}

export type DB = {
    instance: DBInstance,
    connect: (dsn: DBDSN, context: ApplicationContext) => void,
}
export type DBInstance = {
    dsn: DBDSN,
    uploadAsset: (asset: UploadableAsset) => ResErr<string>
}
type DBConnection = unknown;
export const DB_SINGLETON: DB = {
    instance: {
        dsn: {
            host: "localhost",
            port: 5432,
            dbName: "test",
            user: "username",
            password: "password",
            sslMode: "disable",
        },
        uploadAsset: (k) => { return {result: null, error: "No connection initialized"}; }
    },
    connect: connectDB,
}