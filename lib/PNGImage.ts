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

import { RGBA } from "./ChunkPalette";
import { ChunkHeader } from "./Chunk";

export interface PNGImage {
    readonly width:  number;
    readonly height: number;
    readonly hasPalette: boolean;
    readonly pixels: Uint8Array | DataView;
    readonly header: ChunkHeader;

    getPixel (x: number, y: number): Readonly<RGBA>;
    copyPixel(x: number, y: number, rgba: RGBA): RGBA;
    setPixel (x: number, y: number, rgba: Readonly<RGBA>): void;
}

export interface PNGImageWithPalette extends PNGImage {
    getIndex(x: number, y: number): number;
    setIndex(x: number, y: number, index: number): void;
}

const ceil = Math.ceil;

export function computeLineByteWidth(width: number, bitDepth: number, componentCount: number) {
    return (ceil(width * bitDepth / 8)|0) * componentCount;
}

export function computeImageSize(width: number, height: number, bitDepth: number, componentCount: number) {
    return (computeLineByteWidth(width, bitDepth, componentCount) + 1) * height;
}

export function computeLinePixelWidth(width: number, bitDepth: number): number {
    switch (bitDepth) {
    case 1:
        if ((width % 8) !== 0)
            width += (8 - (width % 8));
        break;
    case 2:
        if ((width % 4) !== 0)
            width += (4 - (width % 4));
        break;
    case 4:
        if ((width % 2) !== 0)
            width += (2 - (width % 2));
        break;
    }

    return width;
}
