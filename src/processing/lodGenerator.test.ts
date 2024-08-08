import { test, expect } from "bun:test";
import type { BunFile } from "bun";
import { generateLODs } from "./lodGenerator";
import { fetchBlobFromFile } from "./blobFetcher";

const testImageRes = await fetchBlobFromFile("src/assets/testImage.png");
if (testImageRes.error !== null) {
    console.error(testImageRes.error);
    throw new Error("Failed to fetch test image");
}
const testImage = testImageRes.result;

test("Expect testImage to exist", async () => {
    expect(testImage).not.toBeNull();
    expect(testImage).not.toBeUndefined();
    expect(await (testImage as BunFile).exists()).toBe(true);
    expect(await testImage.arrayBuffer()).not.toBeNull();
    expect(testImage.size).toBeGreaterThan(0);
})

test("No LODs should be created if the threshold is already met by the input image", async () => {
  const res = await generateLODs(testImage, testImage.size / 1000);
  console.log(res.error);
  expect(res).toEqual({result: [{ detailLevel: 0, blob: testImage }], error: null});
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

test("A 160 kb image with threshold 10kb should be downscaled 4 times", async () => {
    const res = await generateLODs(testImage, 10);
    expect(res.error).toBeNull();
    expect(res.result).not.toBeNull();
    expect(res.result).not.toBeUndefined();
    expect(res.result).toBeInstanceOf(Array);
    //The Test image has a size of 160 KB, so it should be downscaled 4 times
    expect(res.result).toHaveLength(5);

    for (const lod of res.result!) {
        const outfile = Bun.file("src/assets/generated/testImageLOD"+lod.detailLevel+".png");
        Bun.write(outfile, lod.blob);
    }
})

