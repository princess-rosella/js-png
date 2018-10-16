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

import { PNGImage }                from "./PNGImage";
import { PNGPixelComponentAccess } from "./PNGPixelComponentAccess"
import { RGBA }                    from "./ChunkPalette";
import { ChunkHeader }             from "./Chunk";
import { ChunkTransparency }       from "./ChunkTransparency";

export class PNGImageGray implements PNGImage {
    header:       ChunkHeader;
    width:        number;
    height:       number;
    pixelsAccess: PNGPixelComponentAccess;

    getPixel:  (x: number, y: number) => Readonly<RGBA>;
    copyPixel: (x: number, y: number, rgba: RGBA) => RGBA;
    setPixel:  (x: number, y: number, rgba: Readonly<RGBA>) => void;

    constructor(header: ChunkHeader, width: number, height: number, widthLine: number, pixels: PNGPixelComponentAccess, transparency?: ChunkTransparency) {
        const w                = widthLine;
        const transparentIndex = transparency? transparency.alphas[0]: 2.0;

        this.header       = header;
        this.width        = width;
        this.height       = height;
        this.pixelsAccess = pixels;

        this.getPixel = function(x, y) {
            const gray = pixels.get((y * w) + x);

            if (transparentIndex === gray)
                return { r: gray, g: gray, b: gray, a: 0.0 };

            return {
                r: gray,
                g: gray,
                b: gray,
                a: 1.0
            };
        };

        this.copyPixel = function(x, y, rgba: RGBA): RGBA {
            const gray = pixels.get((y * w) + x);
            rgba.r = rgba.g = rgba.b = gray;
            rgba.a = transparentIndex === gray? 0.0: 1.0;
            return rgba;
        };

        this.setPixel = function(x, y, rgba: Readonly<RGBA>): void {
            if (rgba.a === 0.0 && transparentIndex <= 1.0) {
                pixels.set((y * w) + x, transparentIndex);
            }
            else if (rgba.a === 1.0) {
                pixels.set((y * w) + x, rgba.g);
            }
            else
                throw new Error("Image doesn't have an alpha channel");
        };
    }

    get hasPalette(): boolean {
        return false;
    }

    get pixels(): Uint8Array | DataView {
        return this.pixelsAccess.pixels;     
    }
}

export class PNGImageGrayAlpha implements PNGImage {
    header:       ChunkHeader;
    width:        number;
    height:       number;
    pixelsAccess: PNGPixelComponentAccess;

    getPixel:  (x: number, y: number) => Readonly<RGBA>;
    copyPixel: (x: number, y: number, rgba: RGBA) => RGBA;
    setPixel:  (x: number, y: number, rgba: Readonly<RGBA>) => void;

    constructor(header: ChunkHeader, width: number, height: number, pixels: PNGPixelComponentAccess) {
        const w           = width;
        this.width        = width;
        this.height       = height;
        this.pixelsAccess = pixels;
        this.header       = header;

        this.getPixel = function(x, y) {
            const position = ((y * w) + x) * 2;
            const gray     = pixels.get(position);
            const alpha    = pixels.get(position + 1);

            return {
                r: gray,
                g: gray,
                b: gray,
                a: alpha
            };
        };

        this.copyPixel = function(x, y, rgba: RGBA): RGBA {
            const position = ((y * w) + x) * 2;
            rgba.r = rgba.g = rgba.b = (pixels.get(position));
            rgba.a = (pixels.get(position + 1));
            return rgba;
        };

        this.setPixel = function(x, y, rgba: Readonly<RGBA>): void {
            const position = ((y * w) + x) * 2;
            pixels.set(position,     rgba.g);
            pixels.set(position + 1, rgba.a);
        };
    }

    get hasPalette(): boolean {
        return false;
    }

    get pixels(): Uint8Array | DataView {
        return this.pixelsAccess.pixels;     
    }
}
