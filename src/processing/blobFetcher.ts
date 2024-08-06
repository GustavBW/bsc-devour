import type { ResErr } from "../ts/metaTypes";

export const fetchBlobFromUrl = async (url: string): Promise<ResErr<Blob>> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return { result: null, error: `HTTP error! status: ${response.status}` };
        }
        const blob = await response.blob();
        return { result: blob, error: null };
    } catch (error) {
        return { result: null, error: (error as any).message };
    }
};