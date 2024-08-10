import type { BunFile } from "bun";
import type { ApplicationContext, ResErr } from "../ts/metaTypes";

const contentTypeHeaderNames = ["content-type", "Content-Type", "Content-type", "Content-Type", "content-Type", "CONTENT-TYPE", "ContentType", "contentType"];
const getTypeFromResponseHeaders = (response: Response, blob: Blob): ResErr<string> => {
    let discoveredContentType = "";

    for (const headerName of contentTypeHeaderNames) {
        if (response.headers.has(headerName)) {
            discoveredContentType = response.headers.get(headerName)!;
            break;
        }
    }

    if (discoveredContentType === "") {
        return { result: null, error: "Could not determine content type from headers" };
    }

    return {result: discoveredContentType, error: null};
}

const getTypeFromURL = (url: string, blob: Blob): ResErr<string> => {
    const extension = url.split(".").pop();
    let discoveredContentType = "";
    switch (extension) {
        case "jpeg": discoveredContentType = "image/jpeg"; break;
        case "jpg": discoveredContentType = "image/jpeg"; break;
        case "png": discoveredContentType = "image/png"; break;
        case "gif": discoveredContentType = "image/gif"; break;
        case "bmp": discoveredContentType = "image/bmp"; break;
        case "svg": discoveredContentType = "image/svg+xml"; break;
        default: return { result: null, error: "Could not determine content type from url" };
    }
    return {result: discoveredContentType, error: null};
}

export const fetchBlobOverHTTP = async (url: string, context?: ApplicationContext): Promise<ResErr<Blob>> => {
    try {
        context?.logger.log(`Fetching blob over http from ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            context?.logger.log(`HTTP error! status: ${response.status}`);
            return { result: null, error: `HTTP error! status: ${response.status}` };
        }

        let blob = await response.blob();
        if (blob.type === "") {
            let discoveredType = "";
            const typeAttemptHeaders = getTypeFromResponseHeaders(response, blob);
            if (typeAttemptHeaders.error === null) { 
                context?.logger.log(`Discovered type from Content-Type header: ${typeAttemptHeaders.result}`);
                discoveredType = typeAttemptHeaders.result; 
            } else {
                const typeAttemptURL = getTypeFromURL(url, blob);
                if (typeAttemptURL.error === null) { 
                    context?.logger.log(`Discovered type from URL: ${typeAttemptURL.result}`);
                    discoveredType = typeAttemptURL.result; 
                } else { 
                    context?.logger.log(`Could not determine content type: ${typeAttemptURL.error}`);
                    return { result: null, error: "Could not determine content type: " + typeAttemptURL.error}; 
                }
            }

            blob = new Blob([blob], { type: discoveredType });
        }
        context?.logger.log(`Blob fetched successfully of type: ${blob.type}`);
        return { result: blob, error: null };
    } catch (error) {
        context?.logger.log(`Error fetching blob: ${(error as any).message}`);
        return { result: null, error: (error as any).message };
    }
}

export const fetchBlobFromFile = async (url: string, init?: boolean, context?: ApplicationContext): Promise<ResErr<Blob>> => {
    context?.logger.log(`Fetching blob from file: ${url}`);
    const file: BunFile = Bun.file(url);
    const fileExists = await file.exists();
    if (!fileExists) {
        context?.logger.log(`File does not exist: ${url}`);
        return { result: null, error: "File does not exist" };
    }
    if (init) {
        context?.logger.log(`Initializing data in blob from: ${url}`);
        await file.arrayBuffer();
    }
    return { result: file, error: null };
}


export const fetchBlobFromUrl = async (url: string, context?: ApplicationContext): Promise<ResErr<Blob>> => {
    if (url === "") {
        return { result: null, error: "Invalid source url" };
    }

    if (url.startsWith("http") || url.startsWith("www")) {
        return fetchBlobOverHTTP(url, context);
    }

    return fetchBlobFromFile(url, false, context);
};