import { test, expect } from "bun:test";
import type { BunFile } from "bun";
import { generateLODs } from "./lodGenerator";

const testImage: BunFile = Bun.file("./src/assets/testImage.png");
await testImage.arrayBuffer()

test("Expect testImage to exist", async () => {
    expect(testImage).not.toBeNull();
    expect(testImage).not.toBeUndefined();
    expect(await testImage.exists()).toBe(true);
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
    expect(res.error).toEqual("Unsupported image type: image/thisFormatDoesNotExist");
});