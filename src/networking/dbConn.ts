// Some postgresql connector here. 

import type { ApplicationContext, Error, ImageMIMEType, ResErr } from "../ts/metaTypes";
import type { AssetUseCase, DBDSN, LODDTO } from "../ts/types";
import pg from 'pg'
export type UploadableAsset = {
    id?: number,
    lods: LODDTO[],
    width: number,
	height: number,
    useCase: AssetUseCase,
    alias: string,
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

export const _uploadAsset = (asset: UploadableAsset, context: ApplicationContext, conn: pg.Client): ResErr<string> => {
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
/** 
 * @throws THROWS!
*/
const tableCheck = async (conn: pg.Client, context: ApplicationContext): Promise<void> => {
    //look for the following tables: LOD, GraphicAsset, CollectionEntry, & AssetCollection
    //if any of them are missing, let it throw
    context.logger.log("[db] Checking for required tables in the database");
    const expectedTablesArr = ["LOD", "GraphicalAsset", "CollectionEntry", "AssetCollection"];

    // Query to check for the existence of the tables
    const result = await conn.query<{table_name: string}>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' 
        AND table_name = ANY($1)
      `, [expectedTablesArr]);
    const existingTables = result.rows.map((row) => row.table_name);

    // Check for missing tables
    const missingTables = expectedTablesArr.filter((table) => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
        context.logger.log("[db] Targeted DB insufficient. Tables missing: " + missingTables.join(", "));
        throw new Error(`The following required tables are missing in the targeted database: ${missingTables.join(', ')}`);
    }
}

const connectDB = async (dsn: DBDSN, context: ApplicationContext): Promise<Error | null> => {
    context.logger.log(`[db] Connecting to database, host: ${dsn.host}, port: ${dsn.port}, name: ${dsn.dbName}, credentials: ${dsn.user} ****`);
    const { Client } = pg;
    const client = new Client({
        user: dsn.user,
        host: dsn.host,
        database: dsn.dbName,
        password: dsn.password,
        port: dsn.port,
        ssl: dsn.sslMode === "require" ? { rejectUnauthorized: false } : false,
    })

    try {
        await client.connect()
    }catch(anything){
        context.logger.log("[db] Connection failed: " + JSON.stringify(anything));
        return anything as string;
    }
    context.logger.log("[db] Connection established");

    //Check connection
    try {
        await tableCheck(client, context);
    } catch (error) {
        //Just making sure a string is returned regardless of what the postgres lib might throw (they don't indicate what they throw, and what methods throws...)
        return JSON.stringify(error);
    }

    DB_SINGLETON.instance = {
        dsn: dsn,                           //Using a closure here to act like a private field in the object
        uploadAsset: (uploadableAsset) => _uploadAsset(uploadableAsset, context, client),
    }

    return null;
}

export type DB = {
    instance: DBInstance,
    connect: (dsn: DBDSN, context: ApplicationContext) => Promise<Error | null>,
}
export type DBInstance = {
    dsn: DBDSN,
    uploadAsset: (asset: UploadableAsset) => ResErr<string>
}
export const DB_SINGLETON: DB = {
    instance: {
        dsn: {
            host: "not_provided",
            port: 0,
            dbName: "not_provided",
            user: "not_provided",
            password: "not_provided",
            sslMode: "not_provided",
        },
        uploadAsset: (k) => { return {result: null, error: "No connection initialized"}; }
    },
    connect: connectDB,
}