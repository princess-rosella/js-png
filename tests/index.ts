/*
 * Copyright (c) 2018 Princess Rosella. All rights reserved.
 *
 * @LICENSE_HEADER_START@
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @LICENSE_HEADER_END@
 */

import { join as pathjoin } from "path";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";

import { PNGFile }      from "../lib/PNGFile";
import { PNGImage }     from "../lib/PNGImage";
import { PNGImageRGBA } from "../lib/PNGImageRGB";
import { RGBA }         from "../lib/ChunkPalette";
import { PNGImageInterlaced } from "../lib/PNGImageInterlaced";

if (!existsSync("tests/in")) {
    throw new Error("No input images");
}

let imageFiles: string[] = [];

for (const fileName of readdirSync("tests/in")) {
    if (!fileName.endsWith(".png"))
        continue;

    imageFiles.push(pathjoin("tests/in", fileName));
}

let foundError = false;

const expectedErrors: { [file: string]: string } = {
    "tests/in/xs7n0g01.png": "Not a PNG file: Invalid header",
    "tests/in/xs4n0g01.png": "Not a PNG file: Invalid header",
    "tests/in/xs2n0g01.png": "Not a PNG file: Invalid header",
    "tests/in/xs1n0g01.png": "Not a PNG file: Invalid header",
    "tests/in/xlfn0g04.png": "Not a PNG file: Invalid header",
    "tests/in/xcrn0g04.png": "Not a PNG file: Invalid header",
    "tests/in/xd0n2c08.png": "Invalid bit depth: 0",
    "tests/in/xd3n2c08.png": "Invalid bit depth: 3",
    "tests/in/xd9n2c08.png": "Invalid bit depth: 99",
    "tests/in/xc1n0g08.png": "Unsupported color type: 1",
    "tests/in/xc9n2c08.png": "Unsupported color type: 9",
    "tests/in/xdtn0g01.png": "unexpected end of file",
};

function assertEqualPixel(p1: RGBA, p2: RGBA) {
    if (p1.r !== p2.r || p1.g !== p2.g || p1.b !== p2.b || p1.a !== p2.a)
        throw new Error(`Pixels are not equal: (${p1.r},${p1.g},${p1.b},${p1.a}) !== (${p2.r},${p2.g},${p2.b},${p2.a})`);
}

function assertEqualPixelInImage(i1: PNGImage, i2: PNGImage, x: number, y: number) {
    let p1 = i1.getPixel(x, y);
    let p2 = i2.getPixel(x, y);
    
    if (p1.r !== p2.r || p2.g !== p2.g || p2.b !== p2.b || p2.a !== p2.a)
        throw new Error(`Pixels are not equal at (${x}, ${y})`);
}

function convertImageToHTML(image: PNGImage): string {
    let text = "";

    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const pixel = image.getPixel(x, y);
            text += `<div style="background-color: rgba(${(pixel.r * 255)|0},${(pixel.g * 255)|0},${(pixel.b * 255)|0},${pixel.a}); width: 8px; height: 8px; display: inline-block;"></div>`;
            image.getPixel(x, y);
        }

        text += "<br>\n";
    }

    if (image instanceof PNGImageInterlaced) {
        text += "<hr>\n";

        for (const subImage of image.images) {
            text += convertImageToHTML(subImage);
            text += "<hr>\n";
        }
    }

    return text;
}

const specificTests: { [file: string]: (file: PNGFile, imageOriginal: PNGImage, imageRGBA: PNGImageRGBA) => void } = {
    "tests/in/s32i3p04.png": function(file, imageOriginal, imageRGBA) {
        assertEqualPixelInImage(imageOriginal, imageRGBA, 0, 0);
        assertEqualPixel(imageRGBA.getPixel(0, 0), {r: 0, g: 0, b: 0, a: 1});

        assertEqualPixel(imageOriginal.getPixel(0, 0), {r: 0, g: 0, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(8, 0), {r: 0, g: 0, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(16, 0), {r: 0, g: 1, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(24, 0), {r: 1, g: 0, b: 0, a: 1});

        assertEqualPixel(imageOriginal.getPixel(4, 0), {r: 0, g: 0, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(12, 0), {r: 1, g: 0, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(20, 0), {r: 0, g: 0, b: 1, a: 1});
        assertEqualPixel(imageOriginal.getPixel(28, 0), {r: 0, g: 1, b: 0, a: 1});

        assertEqualPixel(imageOriginal.getPixel(0, 4), {r: 1, g: 0, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(4, 4), {r: 0, g: 0, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(12, 12), {r: 1, g: 0, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(20, 20), {r: 0, g: 0, b: 1, a: 1});
        assertEqualPixel(imageOriginal.getPixel(28, 28), {r: 0, g: 1, b: 0, a: 1});

        assertEqualPixel(imageOriginal.getPixel(2, 4), {r: 1, g: 1, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(6, 4), {r: 0, g: 0, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(10, 12), {r: 1, g: 0, b: 1, a: 1});
        assertEqualPixel(imageOriginal.getPixel(14, 12), {r: 1, g: 1, b: 0, a: 1});

        assertEqualPixel(imageOriginal.getPixel(2, 2), {r: 1, g: 1, b: 0, a: 1});
        assertEqualPixel(imageOriginal.getPixel(6, 6), {r: 0, g: 0, b: 0, a: 1});
    },
};

for (const filePath of imageFiles) {
    try {
        const nodeBuffer = readFileSync(filePath);
        const filePNG = PNGFile.parse(nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength));
        if (!filePNG)
            throw new Error(`Failed to read ${filePath}`);

        const imageOriginal = filePNG.renderImage();
        if (!imageOriginal)
            throw new Error("Failed to render image");

        const imageRGBA = filePNG.renderImageRGBA();
        if (!imageRGBA)
            throw new Error("Failed to render RGBA image");

        const specificTest = specificTests[filePath];
        if (specificTest)
            specificTest(filePNG, imageOriginal, imageRGBA);

        if (filePNG.width <= 2048 && filePNG.height <= 2048)
            writeFileSync(`${filePath}.html`, convertImageToHTML(imageOriginal));
    }
    catch (e) {
        if (expectedErrors[filePath]) {
            if (e["message"] === expectedErrors[filePath])
                continue;
        }

        console.error(`While processing ${filePath}:`, e["stack"]);
        foundError = true;
        continue;
    }

    if (expectedErrors[filePath]) {
        foundError = true;
        console.error(`While processing ${filePath}: Was expecting exception ${expectedErrors[filePath]}`);
    }
}

if (foundError)
    process.exit(1);

process.exit(0);
