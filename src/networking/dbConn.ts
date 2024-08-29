// Some postgresql connector here. 

import type { ErrorLike } from "bun";
import type { ApplicationContext, Error, ImageMIMEType, ResErr } from "../ts/metaTypes";
import type { AssetUseCase, CollectionEntryDTO, DBDSN, LODDTO, TransformDTO } from "../ts/types";
import pg from 'pg'
import { LogLevel } from "../logging/simpleLogger";

export type UploadableAsset = {
    id?: number,
    lods: LODDTO[],
    width: number,
	height: number,
    useCase: AssetUseCase,
    alias: string,
	type: ImageMIMEType, //MIME type
}
const SQL_UPSERT_GRAPHICAL_ASSET = `
    INSERT INTO GraphicalAsset (id, width, height, "useCase", alias, type, "hasLODs", blob)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET 
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        "useCase" = EXCLUDED.useCase,
        alias = EXCLUDED.alias,
        type = EXCLUDED.type,
        "hasLODs" = EXCLUDED."hasLODs",
        blob = EXCLUDED.blob
    RETURNING id;
`;
const _uploadAsset = async (asset: UploadableAsset, context: ApplicationContext, conn: pg.Client, knownExistingAssets: number[]): Promise<ResErr<string>> => {
    context.logger.log("[db] Uploading asset id: " + asset.id);
    if (asset.lods.length === 0) {
        context.logger.log("[db] Asset did not have at least 1 LOD", LogLevel.ERROR);
        return { result: null, error: "There must be at least 1 LOD" };
    }
    if (asset.id === undefined) {
        context.logger.log("[db] Asset did not have an id", LogLevel.ERROR);
        return { result: null, error: "Asset must have an id" };
    }
    const clearResult = await clearExistingContent(asset.id, context, conn); if (clearResult.error !== null) {
        return {result: null, error: clearResult.error};
    }
    const hasLODS = asset.lods.length > 1;
    const blob = hasLODS ? null : asset.lods[0].blob;

    let insertRes;
    try {
        insertRes = await conn.query<{id: number}>(SQL_UPSERT_GRAPHICAL_ASSET, [
            asset.id,
            asset.width,
            asset.height,
            asset.useCase,
            asset.alias,
            asset.type,
            hasLODS,
            hasLODS ? null : asset.lods[0].blob,
        ]);
    }catch(e){
        context.logger.log("[db] Error inserting/updating graphical asset: " + (e as any).message, LogLevel.ERROR);
        return {result: null, error: (e as any).message};
    }
    context.logger.log("Inserted/updated graphical asset id: " + insertRes.rows[0].id);
    
    //Delete existing LODs of former asset (if any)
    //delete * from LODs where graphicalAsset = asset.id

    knownExistingAssets.push(asset.id!);

    return {result: null, error: "Not implemented ya daft knob"};
}

export type CollectionSpecification = {
    name: string,
    useCase: string,
    entries: CollectionEntryDTO[]
}  

const _establishCollection = async (collection: CollectionSpecification, context: ApplicationContext, conn: pg.Client, knownExistingAssets: number[]): Promise<ResErr<string>> => { 
    let res;
    try {
        res = await conn.query<{ id: number }>(
            `INSERT INTO "AssetCollection" (name, "useCase") VALUES ($1, $2) RETURNING id`,
            [collection.name, collection.useCase]
        );
    }catch (e){
        context.logger.log("[db] Error establishing collection " + collection.name + " error: " + (e as any).message, LogLevel.ERROR);
        return {result: null, error: (e as any).message};
    }
    const assignedID = res.rows[0].id;
    context.logger.log("[db] Established collection " + collection.name + " with id: " + assignedID);

    for (let i = 0; i < collection.entries.length; i++) {
        const entry = collection.entries[i];
        context.logger.log("Inserting collection entry #"+i+" for AssetCollection id: " + assignedID);
        try {
            const err = await insertCollectionEntry(assignedID, entry, conn, context, knownExistingAssets); if (err !== null) {
                return {result: null, error: err};
            }
        } catch (e) {
            context.logger.log("[db] Error inserting collection entry #"+i+" in db: \n\t" + (e as any).message, LogLevel.ERROR);
            return {result: null, error: "Error inserting collection entry #"+i+" in db: \n\t" + (e as any).message};
        }
    }
    context.logger.log("Succesfully established AssetCollection id: " + assignedID);
    return {result: "Succesfully established AssetCollection id: " + assignedID, error: null};
}
/**
 * @throws THROWS!
 */
const insertCollectionEntry = async (collectionId: number, entry: CollectionEntryDTO, conn: pg.Client, context: ApplicationContext, knownExistingAssets: number[]): Promise<Error | null> => {
    // Check if the referenced asset exists before proceeding
    if (!knownExistingAssets.includes(entry.graphicalAssetId)) {
        context.logger.log("[db] Asset id " + entry.graphicalAssetId + " not found in known existing assets. Checking db");
        const res = await conn.query(`SELECT id FROM "GraphicalAsset" WHERE id = $1`, [entry.graphicalAssetId]);
        if (res.rows.length === 0) {
            context.logger.log("[db] Asset id " + entry.graphicalAssetId + " not found in db either, aborting", LogLevel.ERROR);
            return "Asset id " + entry.graphicalAssetId + " not found in known existing assets or in the db, aborting";
        }
    }

    //Inserting transform
    const transformRes = await insertTransform(entry.transform, conn, context); if (transformRes.error !== null) {
        return transformRes.error;
    }

    const insertRes = await conn.query<{id: number}>(
        `INSERT INTO "CollectionEntry" (transform, "graphicalAsset", "assetCollection") VALUES ($1, $2, $3) RETURNING id`,
        [transformRes.result, entry.graphicalAssetId, collectionId]
    )
    if (insertRes.rows.length === 0) {
        context.logger.log("[db] Failed to insert collection entry", LogLevel.ERROR);
        return "Failed to insert collection entry";
    }
    context.logger.log("[db] Inserted collection entry succesfully for collection id: " + collectionId + ", assigned id: " + insertRes.rows[0].id);
    return null;
}
/**
 * 
 * @param transform 
 * @param conn 
 * @param context 
 * @returns the assigned id of the transform
 */
const insertTransform = async (transform: TransformDTO, conn: pg.Client, context: ApplicationContext): Promise<ResErr<number>> => {
    let transformRes;
    try {
        transformRes = await conn.query<{id: number}>(
            `INSERT INTO "Transform" (xOffset, yOffset, zIndex, xScale, yScale) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [transform.xOffset, transform.yOffset, transform.zIndex, transform.xScale, transform.yScale]
        )
    }catch (e){
        context.logger.log("[db] Failed to insert transform: \n\t" + (e as any).message, LogLevel.ERROR);
        return {result: null, error: (e as any).message};
    }

    if (transformRes.rows.length === 0) {
        context.logger.log("[db] Failed to insert transform for collection entry", LogLevel.ERROR);
        return {result: null, error: "Failed to insert transform for collection entry"};
    }
    const transformId = transformRes.rows[0].id;
    return {result: transformId, error: null};
}

type ClearResult = {
    lodsRemoved: number, 
    aliasOfFormer: string
}
const NO_ALIAS_FOUND = "No alias found";
const clearExistingContent = async (graphicalAssetId: number, context: ApplicationContext, client: pg.Client): Promise<ResErr<ClearResult>> => {
    context.logger.log("[db] Clearing existing content for asset id: " + graphicalAssetId);
    
    let deleteLODsRes, getAssetAliasRes;
    try{
        deleteLODsRes = await client.query<any>(`
            DELETE FROM "LOD" WHERE "graphicalAsset" = $1
        `, [graphicalAssetId]);
        
        getAssetAliasRes = await client.query<any>(`
            SELECT alias FROM "GraphicalAsset" WHERE id = $1
        `, [graphicalAssetId]);
    }catch (e) {
        context.logger.log(`[db] Error clearing existing content for asset id: ${graphicalAssetId}, error: \n\t${(e as any).message}`, LogLevel.ERROR);
        return {result: null, error: `Error clearing existing content for asset id: ${graphicalAssetId}, error: \n\t${(e as any).message}`};
    }

    const aliasOfFormer = getAssetAliasRes.rows.length > 0 ? getAssetAliasRes.rows[0].alias : NO_ALIAS_FOUND;

    context.logger.log(`[db] Removed ${deleteLODsRes.rowCount} LODs for asset id: ${graphicalAssetId}, formerly known as: ${aliasOfFormer}`);
    const toReturn = {lodsRemoved: deleteLODsRes.rowCount!, aliasOfFormer: aliasOfFormer};
    return {result: toReturn, error: null};
}
  
export type DB = {
    instance: DBInstance,
    connect: (dsn: DBDSN, context: ApplicationContext) => Promise<Error | null>,
}
export type DBInstance = {
    dsn: DBDSN,
    uploadAsset: (asset: UploadableAsset) => Promise<ResErr<string>>,
    establishCollection: (collection: CollectionSpecification) => Promise<ResErr<string>>,
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
        uploadAsset: (k) => { return Promise.reject({result: null, error: "No connection initialized"}); },
        establishCollection: (k) => { return Promise.reject({result: null, error: "No connection initialized"}); },
    },
    connect: connectDB,
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

async function connectDB(dsn: DBDSN, context: ApplicationContext): Promise<Error | null> {
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

    //Cache-like
    const knownExistingAssets: number[] = []

    DB_SINGLETON.instance = {
        dsn: dsn,                           //Using a closure here to act like a private field in the object
        uploadAsset: (uploadableAsset) => _uploadAsset(uploadableAsset, context, client, knownExistingAssets),
        establishCollection: (collection) => _establishCollection(collection, context, client, knownExistingAssets),
    }

    return null;
}