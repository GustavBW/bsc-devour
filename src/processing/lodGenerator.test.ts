import { test, expect } from "bun:test";
import type { BunFile } from "bun";
import { generateLODs } from "./lodGenerator";
import { fetchBlobFromFile } from "../networking/blobFetcher";
import sharp from "sharp";

const testImageNames = ["testImage.gif", "testImage.jpg", "testImage.png", "testImage.tif", "testImage.webp"];
const testImages: Blob[] = [];
const typesBeingTested = [];
for (const testFile of testImageNames) {
    const res = await fetchBlobFromFile("src/assets/testData/"+testFile);
    if (res.error !== null) {
        console.error(res.error);
        throw new Error("Failed to fetch test image: " + testFile);
    }
    testImages.push(res.result);
    typesBeingTested.push(res.result.type);
}
const pngTestImage = testImages[3];
console.log("Testing image types: " + typesBeingTested.join(", "));

test("Expect test images to exist", async () => {
    for (const testImage of testImages) {
        expect(testImage).not.toBeNull();
        expect(testImage).not.toBeUndefined();
        expect(await (testImage as BunFile).exists()).toBe(true);
        expect(await testImage.arrayBuffer()).not.toBeNull();
        expect(testImage.size).toBeGreaterThan(0);
    }
})

test("No LODs should be created if the threshold is already met by the input image", async () => {
    for (const testImage of testImages) {
        const res = await generateLODs(testImage, testImage.size / 1000);
        expect(res).toEqual({result: [{ detailLevel: 0, blob: testImage }], error: null});
    }
});

//No sense in LOD'ifying svgs
test("No LODs should be created if the input image is an SVG", async () => {
    const testBlob = new Blob([], {type: "image/svg+xml"});
    const res = await generateLODs(testBlob, 10);
    expect(res.error).toEqual("Unsupported image type: image/svg+xml");
});

//Empty images should be rejected
test("No LODs should be created if the input image is empty", async () => {
    const testBlob = new Blob([], {type: "image/png"});
    const res = await generateLODs(testBlob, 10);
    expect(res.error).toEqual("This blob is empty.");
});

//Unsupported image types should be rejected
test("No LODs should be created if the input image is an unsupported type", async () => {
    const testBlob = new Blob([], {type: "image/thisformatdoesnotexist"});
    const res = await generateLODs(testBlob, 10);
    expect(res.error).toEqual("Unsupported image type: image/thisformatdoesnotexist");
});

test("The last LOD generated should be below the threshold", async () => {
    const thresholdKB = 10;
    for (const testImage of testImages) {
        const {result, error} = await generateLODs(testImage, thresholdKB);
        expect(error).toBeNull();
        const lastLOD = result![result!.length - 1];
        expect(lastLOD.blob.size / 1000).toBeLessThanOrEqual(thresholdKB);
    }
});

test("A 160 kb image with threshold 10kb should be downscaled 4 times", async () => {
    const res = await generateLODs(pngTestImage, 10);
    expect(res.error).toBeNull();
    expect(res.result).not.toBeNull();
    expect(res.result).not.toBeUndefined();
    expect(res.result).toBeInstanceOf(Array);
    //The Test image has a size of 160 KB, so it should be downscaled 4 times
    expect(res.result).toHaveLength(5);

    for (const lod of res.result!) {
        const outfile = Bun.file("src/assets/generated/testImageLOD"+lod.detailLevel+".png");
        const data = await lod.blob.arrayBuffer();
        const bytesWritten = await Bun.write(outfile, data);
        expect(bytesWritten).toEqual(data.byteLength);
    }
})

test("Content type is preserved during LOD generation", async () => {
    for (const testImage of testImages) {
        const res = await generateLODs(testImage, 10);
        expect(res.error).toBeNull();
        expect(res.result).not.toBeNull();
        expect(res.result).not.toBeUndefined();
        const expectedType = testImage.type;
        for (const lod of res.result!) {
            expect(lod.blob.type).toEqual(expectedType);
        }
    }
})

const getAlphaTestRes = await fetchBlobFromFile("src/assets/testData/alphaChannelTest.png");
if (getAlphaTestRes.error !== null) {
    console.error(getAlphaTestRes.error);
    throw new Error("Failed to fetch test image: alphaChannelTest.png");
}
const alphaChannelTestImage = getAlphaTestRes.result;

test("Downscaling preserves alpha channnel", async () => {
    const res = await generateLODs(alphaChannelTestImage, 10);
    expect(res.error).toBeNull();
    expect(res.result).not.toBeNull();
    expect(res.result).not.toBeUndefined();
    expect(res.result).toHaveLength(4);

    for (const lod of res.result!) {
        const data = await lod.blob.arrayBuffer();
        expect(data).not.toBeNull();
        expect(data).not.toBeUndefined();
        expect(data.byteLength).toBeGreaterThan(0);

        // Check if the image has an alpha channel
        const metadata = await sharp(Buffer.from(data)).metadata();
        expect(metadata.hasAlpha).toBe(true);

        const outfile = Bun.file("src/assets/generated/alphaChannelTestLOD"+lod.detailLevel+".png");
        const bytesWritten = await Bun.write(outfile, data);
        expect(bytesWritten).toEqual(data.byteLength);
    }
})

