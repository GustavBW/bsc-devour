import { test, expect } from "bun:test";
import { fetchBlobFromUrl, fetchBlobFromFile, fetchBlobOverHTTP } from "./blobFetcher";

test("Can fetch local file", async () => {
    const res = await fetchBlobFromFile("src/assets/testImage.png");
    expect(res.error).toBeNull();
    expect(res.result).not.toBeNull();
    expect(res.result).toBeInstanceOf(Blob);
    expect(res.result!.type).toBe("image/png");
});

test("Can't fetch non-existing file", async () => {
    const res = await fetchBlobFromFile("src/assets/thisFileAbsolutelyCannotExist.asd");
    expect(res.error).not.toBeNull();
    expect(res.result).toBeNull();
});

test("Can fetch remote file", async () => {
    const res = await fetchBlobOverHTTP("https://http.cat/images/404.jpg");
    expect(res.error).toBeNull();
    expect(res.result).not.toBeNull();
    expect(res.result).not.toBeUndefined();
    expect(res.result).toBeInstanceOf(Blob);
    const buff = await res.result!.arrayBuffer();
    expect(buff.byteLength).toBeGreaterThan(38_000);
    expect(res.result!.size).toEqual(buff.byteLength);
    expect(res.result!.type).toBe("image/jpeg");
});

test("Can't fetch non-existing remote file", async () => {
    const res = await fetchBlobOverHTTP("https://http.cat/images/thisFileDoesNotExist.jpg");
    expect(res.error).not.toBeNull();
    expect(res.result).toBeNull();
});

