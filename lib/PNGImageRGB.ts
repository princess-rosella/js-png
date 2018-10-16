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
import { RGBA }                    from "./ChunkPalette";
import { ChunkHeader }             from "./Chunk";
import { ChunkTransparency }       from "./ChunkTransparency";
import { PNGPixelComponentAccess } from "./PNGPixelComponentAccess";

export class PNGImageRGB implements PNGImage {
    width:        number;
    height:       number;
    pixelsAccess: PNGPixelComponentAccess;
    header:       ChunkHeader;

    getPixel:  (x: number, y: number) => Readonly<RGBA>;
    copyPixel: (x: number, y: number, rgba: RGBA) => RGBA;
    setPixel:  (x: number, y: number, rgba: Readonly<RGBA>) => void;

    constructor(header: ChunkHeader, width: number, height: number, pixels: PNGPixelComponentAccess, transparency?: ChunkTransparency) {
        const w                = width;
        const transparentIndex = transparency? { r: transparency.alphas[0], g: transparency.alphas[1], b: transparency.alphas[2] }: null;

        this.width        = width;
        this.height       = height;
        this.pixelsAccess = pixels;
        this.header       = header;

        this.getPixel = function(x, y) {
            const position = ((y * w) + x) * 3;
            const rgba = {
                r: pixels.get(position),
                g: pixels.get(position + 1),
                b: pixels.get(position + 2),
                a: 1.0,
            };

            if (transparentIndex) {
                if (transparentIndex.r === rgba.r &&  transparentIndex.g === rgba.g &&  transparentIndex.b === rgba.b)
                    rgba.a = 0;
            }

            return rgba;
        };

        this.copyPixel = function(x, y, rgba: RGBA): RGBA {
            const position = ((y * w) + x) * 3;
            rgba.r = pixels.get(position);
            rgba.g = pixels.get(position + 1);
            rgba.b = pixels.get(position + 2);
            rgba.a = 1.0;

            if (transparentIndex) {
                if (transparentIndex.r === rgba.r &&  transparentIndex.g === rgba.g &&  transparentIndex.b === rgba.b)
                    rgba.a = 0;
            }

            return rgba;
        };

        this.setPixel = function(x, y, rgba: Readonly<RGBA>): void {
            const position = ((y * w) + x) * 3;

            if (rgba.a === 0) {
                if (transparentIndex && transparentIndex.r === rgba.r &&  transparentIndex.g === rgba.g &&  transparentIndex.b === rgba.b) {
                    pixels.set(position,     transparentIndex.r);
                    pixels.set(position + 1, transparentIndex.g);
                    pixels.set(position + 2, transparentIndex.b);
                    return;
                }
            }
            else if (rgba.a !== 1) {
                throw new Error("Image doesn't support alpha channel");
            }

            pixels.set(position,     rgba.r);
            pixels.set(position + 1, rgba.g);
            pixels.set(position + 2, rgba.b);
        };
    }

    get hasPalette(): boolean {
        return false;
    }

    get pixels(): Uint8Array | DataView {
        return this.pixelsAccess.pixels;     
    }
}

export class PNGImageRGBA implements PNGImage {
    width:        number;
    height:       number;
    pixelsAccess: PNGPixelComponentAccess;
    header:       ChunkHeader;

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
            const position = ((y * w) + x) * 4;

            return {
                r: pixels.get(position),
                g: pixels.get(position + 1),
                b: pixels.get(position + 2),
                a: pixels.get(position + 3)
            };
        };

        this.copyPixel = function(x, y, rgba: RGBA): RGBA {
            const position = ((y * w) + x) * 4;
            rgba.r = pixels.get(position);
            rgba.g = pixels.get(position + 1);
            rgba.b = pixels.get(position + 2);
            rgba.a = pixels.get(position + 3);
            return rgba;
        };

        this.setPixel = function(x, y, rgba: Readonly<RGBA>): void {
            const position       = ((y * w) + x) * 4;
            pixels.set(position,     rgba.r);
            pixels.set(position + 1, rgba.g);
            pixels.set(position + 2, rgba.b);
            pixels.set(position + 3, rgba.a);
        };
    }

    get hasPalette(): boolean {
        return false;
    }

    get pixels(): Uint8Array | DataView {
        return this.pixelsAccess.pixels;     
    }
}
