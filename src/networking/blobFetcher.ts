import type { BunFile } from 'bun';
import type { ApplicationContext, ResErr } from '../ts/metaTypes';
import { findConformingMIMEType } from '../runtimeTypeChecker/type';

const contentTypeHeaderNames = [
    'content-type',
    'Content-Type',
    'Content-type',
    'Content-Type',
    'content-Type',
    'CONTENT-TYPE',
    'ContentType',
    'contentType',
];
const getTypeFromResponseHeaders = (response: Response, blob: Blob): ResErr<string> => {
    let discoveredContentType = '';

    for (const headerName of contentTypeHeaderNames) {
        if (response.headers.has(headerName)) {
            discoveredContentType = response.headers.get(headerName)!;
            break;
        }
    }

    if (discoveredContentType === '') {
        return { result: null, error: 'Could not determine content type from headers' };
    }

    return { result: discoveredContentType, error: null };
};

const getTypeFromURL = (url: string, blob: Blob): ResErr<string> => {
    const extension = url.split('.').pop();
    let discoveredContentType = '';
    switch (extension) {
        case 'jpeg':
            discoveredContentType = 'image/jpeg';
            break;
        case 'jpg':
            discoveredContentType = 'image/jpeg';
            break;
        case 'png':
            discoveredContentType = 'image/png';
            break;
        case 'gif':
            discoveredContentType = 'image/gif';
            break;
        case 'bmp':
            discoveredContentType = 'image/bmp';
            break;
        case 'svg':
            discoveredContentType = 'image/svg+xml';
            break;
        default:
            return { result: null, error: 'Could not determine content type from url' };
    }
    return { result: discoveredContentType, error: null };
};

export const fetchBlobOverHTTP = async (url: string, context?: ApplicationContext): Promise<ResErr<Blob>> => {
    try {
        context?.logger.log(`[fetcher] Fetching blob over http from ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            context?.logger.log(`[fetcher] HTTP error! status: ${response.status}`);
            return { result: null, error: `HTTP error! status: ${response.status}` };
        }

        let blob = await response.blob();
        if (blob.type === '') {
            let discoveredType = '';
            const typeAttemptHeaders = getTypeFromResponseHeaders(response, blob);
            if (typeAttemptHeaders.error === null) {
                context?.logger.log(`[fetcher] Discovered type from Content-Type header: ${typeAttemptHeaders.result}`);
                discoveredType = typeAttemptHeaders.result;
            } else {
                const typeAttemptURL = getTypeFromURL(url, blob);
                if (typeAttemptURL.error === null) {
                    context?.logger.log(`[fetcher] Discovered type from URL: ${typeAttemptURL.result}`);
                    discoveredType = typeAttemptURL.result;
                } else {
                    context?.logger.log(`[fetcher] Could not determine content type: ${typeAttemptURL.error}`);
                    return {
                        result: null,
                        error: 'Could not determine content type: ' + typeAttemptURL.error,
                    };
                }
            }
            const { result, error } = findConformingMIMEType(discoveredType);
            if (error !== null) {
                context?.logger.log(`[fetcher] Error determining corresponding MIME type for discovered type ${discoveredType}: ${error}`);
                return { result: null, error: error };
            }

            blob = new Blob([blob], { type: result });
        }
        context?.logger.log(`[fetcher] Blob fetched successfully of type: ${blob.type}`);
        return { result: blob, error: null };
    } catch (error) {
        context?.logger.log(`[fetcher] Error fetching blob: ${(error as any).message}`);
        return { result: null, error: (error as any).message };
    }
};

export const fetchBlobFromFile = async (url: string, init?: boolean, context?: ApplicationContext): Promise<ResErr<Blob>> => {
    context?.logger.log(`[fetcher] Fetching blob from file: ${url}`);
    let file: BunFile | Blob = Bun.file(url);
    const fileExists = await (file as BunFile).exists();
    if (!fileExists) {
        context?.logger.log(`[fetcher] File does not exist: ${url}`);
        return { result: null, error: 'File does not exist' };
    }
    const { result, error } = findConformingMIMEType(file.type);
    if (error !== null) {
        context?.logger.log(`[fetcher] Error determining MIME type for file ${url}: ${error}`);
        return { result: null, error: error };
    }
    if (result !== file.type) {
        context?.logger.log(`[fetcher] Replacing existing type of file ${url}: ${file.type} with corresponding MIME type: ${result}`);
        file = new Blob([file], { type: result });
    }

    if (init) {
        context?.logger.log(`[fetcher] Initializing data in blob from: ${url}`);
        await file.arrayBuffer();
    }
    return { result: file, error: null };
};

export const fetchBlobFromUrl = async (url: string, context?: ApplicationContext): Promise<ResErr<Blob>> => {
    if (url === '') {
        return { result: null, error: 'Invalid source url' };
    }

    if (url.startsWith('http') || url.startsWith('www')) {
        return fetchBlobOverHTTP(url, context);
    }

    return fetchBlobFromFile(url, false, context);
};
