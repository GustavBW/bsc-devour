import { test, expect, describe } from 'bun:test';
import type { BunFile } from 'bun';
import { calculateRequiredLODs, calculateXYScalarForLOD as calculateXYScalarForDetailLevel, generateLODs } from './lodGenerator';
import { fetchBlobFromFile } from '../networking/blobFetcher';
import sharp from 'sharp';
import { getMetaDataAsIfImage } from './imageUtil';
import type { ImageMIMEType } from '../ts/metaTypes';

//Kindly do not alter ordering
const testImageNames = ['testImage.gif', 'testImage.jpg', 'testImage.png', 'testImage.tiff', 'testImage.webp', 'testImage.svg'];
const testImages: Blob[] = [];
const typesBeingTested = [];
for (const testFile of testImageNames) {
    const res = await fetchBlobFromFile('src/assets/testData/' + testFile);
    if (res.error !== null) {
        console.error(res.error);
        throw new Error('Failed to fetch test image: ' + testFile);
    }
    testImages.push(res.result);
    typesBeingTested.push(res.result.type);
}
const pngTestImage = testImages[3];
console.log('Testing image types: ' + typesBeingTested.join(', '));

test('Expect test images to exist', async () => {
    for (const testImage of testImages) {
        expect(testImage).not.toBeNull();
        expect(testImage).not.toBeUndefined();
        expect(await (testImage as BunFile).exists()).toBe(true);
        expect(await testImage.arrayBuffer()).not.toBeNull();
        expect(testImage.size).toBeGreaterThan(0);
        expect(testImage.type).not.toBeNull();
        expect(testImage.type).not.toBeUndefined();
    }
});

test('Only 1 LOD should be created if the threshold is already met by the input image', async () => {
    for (const testImage of testImages) {
        if (testImage.type === 'image/svg+xml') {
            continue;
        }
        const scaledDownSize = testImage.size / 1000;
        const res = await generateLODs(testImage, scaledDownSize);
        expect(res.error).toBeNull();
        expect(res.result).not.toBeNull();
        expect(res.result).not.toBeUndefined();
        //We expect the original as detail level 0
        //And then 1 lod, as the threshold is but exactly met
        expect(res.result).toHaveLength(2);
        expect(res.result![0].detailLevel).toEqual(0);
        expect(res.result![0].type).toEqual(testImage.type as ImageMIMEType);
        expect(res.result![0].blob).toEqual(testImage);
        expect(res.result![1].detailLevel).toEqual(1);
        expect(res.result![1].type).toEqual(testImage.type as ImageMIMEType);
    }
});

//No sense in LOD'ifying svgs
test('Only exactly 1 LOD, lod 0, should be created if the input image is an SVG', async () => {
    const testBlob = new Blob([testImages[5]], { type: 'image/svg+xml' });
    const res = await generateLODs(testBlob, 1);
    expect(res.error).toBeNull();
    expect(res.result).toHaveLength(1);
    expect(res.result![0].detailLevel).toEqual(0);
    expect(res.result![0].blob).toEqual(testBlob);
});

//Empty images should be rejected
test('No LODs should be created if the input image is empty', async () => {
    const testBlob = new Blob([], { type: 'image/png' });
    const res = await generateLODs(testBlob, 10);
    expect(res.error).toEqual('This blob is empty.');
});

//Unsupported image types should be rejected
test('No LODs should be created if the input image is an unsupported type', async () => {
    const testBlob = new Blob([], { type: 'image/thisformatdoesnotexist' });
    const res = await generateLODs(testBlob, 10);
    expect(res.error).toEqual('No corresponding MIME type found for type: image/thisformatdoesnotexist');
});

test('The last LOD generated should be below the threshold', async () => {
    const thresholdKB = 10;
    //This test MAY fail on the SVG test image, but it really shouldn't happen for a threshold of 10 KB
    for (const testImage of testImages) {

        const { result, error } = await generateLODs(testImage, thresholdKB);
        expect(error).toBeNull();
        const smallestLOD = result!.reduce((prev, current) => { return prev.detailLevel > current.detailLevel ? prev : current; });
        const diff = Math.abs(thresholdKB - smallestLOD.blob.size / 1000);
        //TODO: Renable this check
        //expect(diff).toBeLessThanOrEqual(thresholdKB * 0.15);
    }
});

test('A 160 kb image with threshold 10kb should be downscaled 4 times', async () => {
    const res = await generateLODs(pngTestImage, 10);
    expect(res.error).toBeNull();
    expect(res.result).not.toBeNull();
    expect(res.result).not.toBeUndefined();
    expect(res.result).toBeInstanceOf(Array);
    //The Test image has a size of 160 KB, so it should be downscaled 4 times
    expect(res.result).toHaveLength(5);

    for (const lod of res.result!) {
        const outfile = Bun.file('src/assets/generated/testImageLOD' + lod.detailLevel + '.png');
        const data = await lod.blob.arrayBuffer();
        const bytesWritten = await Bun.write(outfile, data);
        expect(bytesWritten).toEqual(data.byteLength);
    }
});

test('Content type is preserved during LOD generation', async () => {
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
});

const getAlphaTestRes = await fetchBlobFromFile('src/assets/testData/alphaChannelTest.png');
if (getAlphaTestRes.error !== null) {
    console.error(getAlphaTestRes.error);
    throw new Error('Failed to fetch test image: alphaChannelTest.png');
}
const alphaChannelTestImage = getAlphaTestRes.result;

test('Downscaling preserves alpha channnel', async () => {
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

        const outfile = Bun.file('src/assets/generated/alphaChannelTestLOD' + lod.detailLevel + '.png');
        const bytesWritten = await Bun.write(outfile, data);
        expect(bytesWritten).toEqual(data.byteLength);
    }
});


describe('LOD Generation Math Tests', () => {
    test('calculateRequiredLODs should return 1 for a size equal to threshhold', () => {
        expect(calculateRequiredLODs(100, 100)).toEqual(1);
    });
    test('calculateRequiredLODs should return 0 for a size less than threshhold', () => {
        expect(calculateRequiredLODs(99, 100)).toEqual(0);
    });
    test('calculateRequiredLODs should return 1 for a size greater than threshhold', () => {
        expect(calculateRequiredLODs(101, 100)).toEqual(1);
    });
    test('calculateRequiredLODs should return 2 for a size 4 times greater than threshhold', () => {
        expect(calculateRequiredLODs(50 * 4, 50)).toEqual(2);
    });
    test('calculateRequiredLODs should return 3 for a size 16 times greater than threshhold', () => {
        expect(calculateRequiredLODs(50 * 16, 50)).toEqual(3);
    });
    test('calculateRequiredLODs should return 4 for a size 64 times greater than threshhold', () => {
        expect(calculateRequiredLODs(50 * 64, 50)).toEqual(4);
    });
    test('calculateRequiredLODs should return 5 for a size 256 times greater than threshhold', () => {
        expect(calculateRequiredLODs(50 * 256, 50)).toEqual(5);
    });
    test('calculateRequiredLODs should return 6 for a size 1024 times greater than threshhold', () => {
        expect(calculateRequiredLODs(50 * 1024, 50)).toEqual(6);
    });
    test('calculateRequiredLODs should return 7 for a size 4096 times greater than threshhold', () => {
        expect(calculateRequiredLODs(50 * 4096, 50)).toEqual(7);
    });

    test('calculateScalarForLOD should return 1 for lod detail level 0', () => {
        expect(calculateXYScalarForDetailLevel(0)).toEqual(1);
    });
    test('calculateScalarForLOD should return 1/2 for lod detail level 1', () => {
        expect(calculateXYScalarForDetailLevel(1)).toEqual(1 / 2);
    });
    test('calculateScalarForLOD should return 1/4 for lod detail level 2', () => {
        expect(calculateXYScalarForDetailLevel(2)).toEqual(1 / 4);
    });
    test('calculateScalarForLOD should return 1/8 for lod detail level 3', () => {
        expect(calculateXYScalarForDetailLevel(3)).toEqual(1 / 8);
    });
    test('calculateScalarForLOD should return 1/16 for lod detail level 4', () => {
        expect(calculateXYScalarForDetailLevel(4)).toEqual(1 / 16);
    });
    test('calculateScalarForLOD should return 1/32 for lod detail level 5', () => {
        expect(calculateXYScalarForDetailLevel(5)).toEqual(1 / 32);
    });
})