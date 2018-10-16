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
import { MD5 } from "spu-md5";

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

const expectedDifferences = new Set<string>([
    "tests/in/xcsn0g01.png",
    "tests/in/xhdn0g08.png",
]);

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

function readFile(filePath: string): ArrayBuffer {
    const nb = readFileSync(filePath);
    return nb.buffer.slice(nb.byteOffset, nb.byteOffset + nb.byteLength);
}

function hashImage(image: PNGImage): string {
    const pixels = new Uint16Array(image.width * image.height * 4);
    let index = 0;
    let pixel = {r: 0, g: 0, b: 0, a:0 };

    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            image.copyPixel(x, y, pixel);
            pixels[index++] = (pixel.r * 65535)|0;
            pixels[index++] = (pixel.g * 65535)|0;
            pixels[index++] = (pixel.b * 65535)|0;
            pixels[index++] = (pixel.a * 65535)|0;
        }
    }

    return MD5.process(pixels.buffer);
}

const hash: { [key: string]: string } = {
    "tests/in/PngSuite.png": "3f4f3760542cebe7a8cc863e77617057",
    "tests/in/basi0g01.png": "cb4ef0ac3d2927af7e873e55bfa9f2eb",
    "tests/in/basi0g02.png": "38ae0c48b59a46025b10ce7cfc96a19e",
    "tests/in/basi0g04.png": "a6f81a2f4af074b5febf46405f5ce718",
    "tests/in/basi0g08.png": "09e988d9be4f871e6e34f99db4e0c03b",
    "tests/in/basi0g16.png": "3bc27003f69c742fc558ca88e590b555",
    "tests/in/basi2c08.png": "0bc8f7816b2ea328ad3510c3f2807d80",
    "tests/in/basi2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/basi3p01.png": "918cdab065790c317f0f3a8cdc5834b8",
    "tests/in/basi3p02.png": "7d02aaf2ef70174ed8e6a11de414a278",
    "tests/in/basi3p04.png": "d2cd3f7f10c82da8d6dde7a7119d315b",
    "tests/in/basi3p08.png": "0f41348d1659cdbe98e74f45f5f7b9dc",
    "tests/in/basi4a08.png": "32f4a1a3ce43105789281f784dea1b88",
    "tests/in/basi4a16.png": "2ad03a20be76d8b65b0531923b927376",
    "tests/in/basi6a08.png": "5808424284368945d766d88995577c1c",
    "tests/in/basi6a16.png": "d57ec1986287a5428dd8405bd5952732",
    "tests/in/basn0g01.png": "cb4ef0ac3d2927af7e873e55bfa9f2eb",
    "tests/in/basn0g02.png": "38ae0c48b59a46025b10ce7cfc96a19e",
    "tests/in/basn0g04.png": "a6f81a2f4af074b5febf46405f5ce718",
    "tests/in/basn0g08.png": "09e988d9be4f871e6e34f99db4e0c03b",
    "tests/in/basn0g16.png": "3bc27003f69c742fc558ca88e590b555",
    "tests/in/basn2c08.png": "0bc8f7816b2ea328ad3510c3f2807d80",
    "tests/in/basn2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/basn3p01.png": "918cdab065790c317f0f3a8cdc5834b8",
    "tests/in/basn3p02.png": "7d02aaf2ef70174ed8e6a11de414a278",
    "tests/in/basn3p04.png": "d2cd3f7f10c82da8d6dde7a7119d315b",
    "tests/in/basn3p08.png": "0f41348d1659cdbe98e74f45f5f7b9dc",
    "tests/in/basn4a08.png": "32f4a1a3ce43105789281f784dea1b88",
    "tests/in/basn4a16.png": "2ad03a20be76d8b65b0531923b927376",
    "tests/in/basn6a08.png": "5808424284368945d766d88995577c1c",
    "tests/in/basn6a16.png": "d57ec1986287a5428dd8405bd5952732",
    "tests/in/bgai4a08.png": "32f4a1a3ce43105789281f784dea1b88",
    "tests/in/bgai4a16.png": "2ad03a20be76d8b65b0531923b927376",
    "tests/in/bgan6a08.png": "5808424284368945d766d88995577c1c",
    "tests/in/bgan6a16.png": "d57ec1986287a5428dd8405bd5952732",
    "tests/in/bgbn4a08.png": "32f4a1a3ce43105789281f784dea1b88",
    "tests/in/bggn4a16.png": "2ad03a20be76d8b65b0531923b927376",
    "tests/in/bgwn6a08.png": "5808424284368945d766d88995577c1c",
    "tests/in/bgyn6a16.png": "d57ec1986287a5428dd8405bd5952732",
    "tests/in/ccwn2c08.png": "97793995689adfe61f221a85fec0e6aa",
    "tests/in/ccwn3p08.png": "577930348753a49707578b5c3ea3724f",
    "tests/in/cdfn2c08.png": "c9a24c46b040ec5bd43b46ffd7fb97b6",
    "tests/in/cdhn2c08.png": "8e8d3a0802ac4f642dc7bdeb2e1fecac",
    "tests/in/cdsn2c08.png": "2b8759de9969cdf663e78c254b07c133",
    "tests/in/cdun2c08.png": "a863bfed37df9827eff6af06d0bd3841",
    "tests/in/ch1n3p04.png": "d2cd3f7f10c82da8d6dde7a7119d315b",
    "tests/in/ch2n3p08.png": "0f41348d1659cdbe98e74f45f5f7b9dc",
    "tests/in/cm0n0g04.png": "76a5ef80932d6f45d1068a44c5a698e6",
    "tests/in/cm7n0g04.png": "76a5ef80932d6f45d1068a44c5a698e6",
    "tests/in/cm9n0g04.png": "76a5ef80932d6f45d1068a44c5a698e6",
    "tests/in/cs3n2c16.png": "40f645ea3f9f27df77e6520afa4ef435",
    "tests/in/cs3n3p08.png": "564a25d70a12f4091c9e05391318adbb",
    "tests/in/cs5n2c08.png": "df1402c97aceae73ce6abbdc0481d796",
    "tests/in/cs5n3p08.png": "df1402c97aceae73ce6abbdc0481d796",
    "tests/in/cs8n2c08.png": "6ccc1ae9c0cb7e935a34c04ada6f1f38",
    "tests/in/cs8n3p08.png": "6ccc1ae9c0cb7e935a34c04ada6f1f38",
    "tests/in/ct0n0g04.png": "76a5ef80932d6f45d1068a44c5a698e6",
    "tests/in/ct1n0g04.png": "76a5ef80932d6f45d1068a44c5a698e6",
    "tests/in/cten0g04.png": "ef5ab19fd08f569fd72c77913d8f0e69",
    "tests/in/ctfn0g04.png": "a1eb328a36fb51ae0e3528c520ddd0f5",
    "tests/in/ctfr0g04.png": "76d3fd85e4092aca16bd0328c409ed06",
    "tests/in/ctgn0g04.png": "f68f038e4c12cde15a13afec2c38ab8b",
    "tests/in/cthn0g04.png": "76d3fd85e4092aca16bd0328c409ed06",
    "tests/in/ctjn0g04.png": "547e522e2a43b6db8c9eabd308f2488d",
    "tests/in/ctzn0g04.png": "76a5ef80932d6f45d1068a44c5a698e6",
    "tests/in/f00n0g08.png": "e320bf1dfaa974bf6c7be0f05444a0a7",
    "tests/in/f00n2c08.png": "061b160c126ef6e8046de3379bc76ad3",
    "tests/in/f01n0g08.png": "817ee373f7e6e93df6e330629fb72d7b",
    "tests/in/f01n2c08.png": "51ee52d38f1bd016ddc4dd2ffe98498a",
    "tests/in/f02n0g08.png": "6aaf5d67e60a9caa8efa680a8e5f52ea",
    "tests/in/f02n2c08.png": "aa469177655c20fe4931aecdbd078937",
    "tests/in/f03n0g08.png": "65419e7f10285cd58e2f3bf15a23bd34",
    "tests/in/f03n2c08.png": "63d910dc80b3ae0fda247834f2994a06",
    "tests/in/f04n0g08.png": "daa04c513e6056b81341ca5d5cee059e",
    "tests/in/f04n2c08.png": "088a1cc806e9ee78cb6903cedf819dd7",
    "tests/in/f99n0g04.png": "8c65220d33ea64397b72eb498f54f266",
    "tests/in/g03n0g16.png": "0a50ed90eeaac037423b85d27beb8bbb",
    "tests/in/g03n2c08.png": "96090bd6f9e18d47501c7767b57db1b3",
    "tests/in/g03n3p04.png": "5e802f415e5615aa10e55f46fcf9fc84",
    "tests/in/g04n0g16.png": "d47c78b11b397bb8927f3ccb5c98d3ca",
    "tests/in/g04n2c08.png": "e1508523722b5d32b06646cc5ca6af30",
    "tests/in/g04n3p04.png": "a431461d5b9e39a4656c531a808c5e61",
    "tests/in/g05n0g16.png": "b4437c519c911396fe7b05dff5456fbd",
    "tests/in/g05n2c08.png": "c98faa3c6cb1664541bcecbaedb01efa",
    "tests/in/g05n3p04.png": "5d3fe8049b78fa2c4a631b58497c1bda",
    "tests/in/g07n0g16.png": "f866d489c3e4b78a6bbe37c18b242506",
    "tests/in/g07n2c08.png": "3d51e234ae6e2b56a4ef34e61db30a1b",
    "tests/in/g07n3p04.png": "74840cd85037c44bcc288003440db616",
    "tests/in/g10n0g16.png": "c859802f9cc92a4aefecff17a6f42b24",
    "tests/in/g10n2c08.png": "12e0b7f426c9cc5a56d55cfe06b447e8",
    "tests/in/g10n3p04.png": "efe6d0cb662635959011f195bd26b2b0",
    "tests/in/g25n0g16.png": "2ceeb2c269d4c4bc8f269d88c82497fb",
    "tests/in/g25n2c08.png": "339092fd1104a67b62bd4e6aec43b8e4",
    "tests/in/g25n3p04.png": "00e3b01c88235c98fc4164b00bf9994c",
    "tests/in/gh-21.png": "fd82320879b4ee2349917ec4037afd9f",
    "tests/in/large.png": "dc1c98d948c23dfe07d3624e8d5b459d",
    "tests/in/oi1n0g16.png": "3bc27003f69c742fc558ca88e590b555",
    "tests/in/oi1n2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/oi2n0g16.png": "3bc27003f69c742fc558ca88e590b555",
    "tests/in/oi2n2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/oi4n0g16.png": "3bc27003f69c742fc558ca88e590b555",
    "tests/in/oi4n2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/oi9n0g16.png": "3bc27003f69c742fc558ca88e590b555",
    "tests/in/oi9n2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/pp0n2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/pp0n6a08.png": "9406104f1b0dd7d8d1ca635e9882a13a",
    "tests/in/ps1n0g08.png": "09e988d9be4f871e6e34f99db4e0c03b",
    "tests/in/ps1n2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/ps2n0g08.png": "09e988d9be4f871e6e34f99db4e0c03b",
    "tests/in/ps2n2c16.png": "bcdf952b459c5f7de9576e10acbe98b2",
    "tests/in/s01i3p01.png": "7a4463a978ae7b6e7b46254898b1aa3e",
    "tests/in/s01n3p01.png": "7a4463a978ae7b6e7b46254898b1aa3e",
    "tests/in/s02i3p01.png": "68aeb2925d8e7e96e608d59db24bb93a",
    "tests/in/s02n3p01.png": "68aeb2925d8e7e96e608d59db24bb93a",
    "tests/in/s03i3p01.png": "b37faadfe5c0a1e41802e549dcb2fe25",
    "tests/in/s03n3p01.png": "b37faadfe5c0a1e41802e549dcb2fe25",
    "tests/in/s04i3p01.png": "07108ae1c9d17b4960a1fab867b1d53f",
    "tests/in/s04n3p01.png": "07108ae1c9d17b4960a1fab867b1d53f",
    "tests/in/s05i3p02.png": "b52826359b1e2f982892854c8f3cfc4c",
    "tests/in/s05n3p02.png": "b52826359b1e2f982892854c8f3cfc4c",
    "tests/in/s06i3p02.png": "3d7a67788a7fdbe792165ef0b85fa5cc",
    "tests/in/s06n3p02.png": "3d7a67788a7fdbe792165ef0b85fa5cc",
    "tests/in/s07i3p02.png": "c0163fbd0d9ed31204edb89a3826d09a",
    "tests/in/s07n3p02.png": "c0163fbd0d9ed31204edb89a3826d09a",
    "tests/in/s08i3p02.png": "123b75cdff20d1daa0d4040a476d96d9",
    "tests/in/s08n3p02.png": "123b75cdff20d1daa0d4040a476d96d9",
    "tests/in/s09i3p02.png": "23b84bb86e771f1c0f190627f1dc284d",
    "tests/in/s09n3p02.png": "23b84bb86e771f1c0f190627f1dc284d",
    "tests/in/s32i3p04.png": "9d71fc9f1cd74cd759e166b9e83cd13e",
    "tests/in/s32n3p04.png": "9d71fc9f1cd74cd759e166b9e83cd13e",
    "tests/in/s33i3p04.png": "97ea37db85f6db4bc2fdecde465554ba",
    "tests/in/s33n3p04.png": "97ea37db85f6db4bc2fdecde465554ba",
    "tests/in/s34i3p04.png": "4be5da4eb23d2f2d930654c2e217cfef",
    "tests/in/s34n3p04.png": "4be5da4eb23d2f2d930654c2e217cfef",
    "tests/in/s35i3p04.png": "3cbcf2ff3ba14b7a35e4947e0b4b8daa",
    "tests/in/s35n3p04.png": "3cbcf2ff3ba14b7a35e4947e0b4b8daa",
    "tests/in/s36i3p04.png": "4548b1c86ed2bcd82a5cf9cceab2e616",
    "tests/in/s36n3p04.png": "4548b1c86ed2bcd82a5cf9cceab2e616",
    "tests/in/s37i3p04.png": "8473a03b9203ee8b13355ccc027351fc",
    "tests/in/s37n3p04.png": "8473a03b9203ee8b13355ccc027351fc",
    "tests/in/s38i3p04.png": "920ecc1d80d30189efa13f4c8cdd250f",
    "tests/in/s38n3p04.png": "920ecc1d80d30189efa13f4c8cdd250f",
    "tests/in/s39i3p04.png": "cd3358ff34f03b7c25814c75dcd7c3a2",
    "tests/in/s39n3p04.png": "cd3358ff34f03b7c25814c75dcd7c3a2",
    "tests/in/s40i3p04.png": "c8207d5f2c540cc967cbc404f5312f36",
    "tests/in/s40n3p04.png": "c8207d5f2c540cc967cbc404f5312f36",
    "tests/in/tbbn0g04.png": "0df7c8fb35420221996b2278a6506603",
    "tests/in/tbbn2c16.png": "b655ac1b06076472af9ec6baef353657",
    "tests/in/tbbn3p08.png": "9b2ebce0c85a8db4ccca51086de5d056",
    "tests/in/tbgn2c16.png": "b655ac1b06076472af9ec6baef353657",
    "tests/in/tbgn3p08.png": "9b2ebce0c85a8db4ccca51086de5d056",
    "tests/in/tbrn2c08.png": "4b9c8b9e546d20371796994bf7c16044",
    "tests/in/tbwn0g16.png": "82636289ca9bb1faa0916e991be688a8",
    "tests/in/tbwn3p08.png": "9b2ebce0c85a8db4ccca51086de5d056",
    "tests/in/tbyn3p08.png": "9b2ebce0c85a8db4ccca51086de5d056",
    "tests/in/tm3n3p02.png": "4c49d39e2d9b657caa737ab425d7f549",
    "tests/in/tp0n0g08.png": "341cbf23866c9d5cacf3699008ecdc4e",
    "tests/in/tp0n2c08.png": "b46509ca63255d4fe6b1f8c817323022",
    "tests/in/tp0n3p08.png": "5fa2ab3517b486684fc4416d21d7bd9a",
    "tests/in/tp1n3p08.png": "9b2ebce0c85a8db4ccca51086de5d056",
    "tests/in/xcsn0g01.png": "cb4ef0ac3d2927af7e873e55bfa9f2eb",
    "tests/in/xhdn0g08.png": "09e988d9be4f871e6e34f99db4e0c03b",
    "tests/in/z00n2c08.png": "ee8656c8d16dcb5afc5b2cf3e9af771c",
    "tests/in/z03n2c08.png": "ee8656c8d16dcb5afc5b2cf3e9af771c",
    "tests/in/z06n2c08.png": "ee8656c8d16dcb5afc5b2cf3e9af771c",
    "tests/in/z09n2c08.png": "ee8656c8d16dcb5afc5b2cf3e9af771c"
};

for (const filePath of imageFiles) {
    try {
        const buffer = readFile(filePath);
        const filePNG = PNGFile.parse(buffer);
        if (!filePNG)
            throw new Error(`Failed to read ${filePath}`);

        const imageOriginal = filePNG.renderImage();
        if (!imageOriginal)
            throw new Error("Failed to render image");

        const imageOriginalHash = hashImage(imageOriginal);
        if (imageOriginalHash !== hash[filePath]) {
            writeFileSync(`${filePath.replace("tests/in", "tests.out")}.html`, convertImageToHTML(imageOriginal));
            throw new Error(`Rendered image changed from expected values. Got ${imageOriginalHash}. Expected ${hash[filePath]}`);
        }

        const [, imageRGBA] = filePNG.toRGBA();
        if (!imageRGBA)
            throw new Error("Failed to render RGBA image");

        const imageRGBAHash = hashImage(imageRGBA);
        if (imageRGBAHash !== hash[filePath])
                throw new Error(`Rendered image changed from expected values. Got ${imageRGBAHash}. Expected ${hash[filePath]}`);
    
        const specificTest = specificTests[filePath];
        if (specificTest)
            specificTest(filePNG, imageOriginal, imageRGBA);

        const generatedBuffer = filePNG.toArrayBuffer();

        if (!expectedDifferences.has(filePath)) {
            if ((generatedBuffer.byteLength !== buffer.byteLength) || (MD5.process(generatedBuffer) !== MD5.process(buffer))) {
                writeFileSync(filePath.replace("tests/in", "tests.out"), new Uint8Array(generatedBuffer))
                throw new Error("Image was changed during serialization");
            }
        }
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
