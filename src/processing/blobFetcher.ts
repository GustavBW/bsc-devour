import type { BunFile } from "bun";
import type { ResErr } from "../ts/metaTypes";

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

export const fetchBlobOverHTTP = async (url: string): Promise<ResErr<Blob>> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return { result: null, error: `HTTP error! status: ${response.status}` };
        }

        let blob = await response.blob();
        if (blob.type === "") {
            let discoveredType = "";
            const typeAttemptHeaders = getTypeFromResponseHeaders(response, blob);
            if (typeAttemptHeaders.error === null) { discoveredType = typeAttemptHeaders.result; }
            else {
                const typeAttemptURL = getTypeFromURL(url, blob);
                if (typeAttemptURL.error === null) { discoveredType = typeAttemptURL.result; }
                else { return { result: null, error: "Could not determine content type" }; }
            }
            blob = new Blob([blob], { type: discoveredType });
        }

        return { result: blob, error: null };
    } catch (error) {
        return { result: null, error: (error as any).message };
    }
}

export const fetchBlobFromFile = async (url: string): Promise<ResErr<Blob>> => {
    const file: BunFile = Bun.file(url);
    if (!file.exists()) {
        return { result: null, error: "File does not exist" };
    }
    return { result: file, error: null };
}


export const fetchBlobFromUrl = async (url: string): Promise<ResErr<Blob>> => {
    if (url === "") {
        return { result: null, error: "Invalid source url" };
    }

    if (url.startsWith("http") || url.startsWith("www")) {
        return fetchBlobOverHTTP(url);
    }

    return fetchBlobFromFile(url);
};