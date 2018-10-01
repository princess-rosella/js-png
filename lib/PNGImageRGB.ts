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

import { PNGImage }          from "./PNGImage";
import { RGBA }              from "./ChunkPalette";
import { ChunkTransparency } from "./ChunkTransparency";

export class PNGImageRGB implements PNGImage {
    width:  number;
    height: number;

    getPixel:  (x: number, y: number) => Readonly<RGBA>;
    copyPixel: (x: number, y: number, rgba: RGBA) => RGBA;
    setPixel:  (x: number, y: number, rgba: Readonly<RGBA>) => void;

    constructor(width: number, height: number, pixels: Uint8Array | Uint16Array, transparency?: ChunkTransparency) {
        const w                = width;
        const transparentIndex = transparency? { r: transparency.alphas[0], g: transparency.alphas[1], b: transparency.alphas[2] }: null;
        const sixteenBits      = pixels instanceof Uint16Array;
        const divider          = sixteenBits? 65535.0: 255.0;
        const mask             = sixteenBits? 0xffff: 0xff;

        this.width  = width;
        this.height = height;

        this.getPixel = function(x, y) {
            const position = ((y * w) + x) * 3;
            const rgba = {
                r: pixels[position] / divider,
                g: pixels[position + 1] / divider,
                b: pixels[position + 2] / divider,
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
            rgba.r = pixels[position] / divider;
            rgba.g = pixels[position + 1] / divider;
            rgba.b = pixels[position + 2] / divider;
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
                    pixels[position]     = (transparentIndex.r * divider) & mask;
                    pixels[position + 1] = (transparentIndex.g * divider) & mask;
                    pixels[position + 2] = (transparentIndex.b * divider) & mask;
                    return;
                }
            }
            else if (rgba.a !== 1) {
                throw new Error("Image doesn't support alpha channel");
            }

            pixels[position]     = (rgba.r * divider) & mask;
            pixels[position + 1] = (rgba.g * divider) & mask;
            pixels[position + 2] = (rgba.b * divider) & mask;
        };
    }

    get hasPalette(): boolean {
        return false;
    }
}

export class PNGImageRGBA implements PNGImage {
    width:  number;
    height: number;

    getPixel:  (x: number, y: number) => Readonly<RGBA>;
    copyPixel: (x: number, y: number, rgba: RGBA) => RGBA;
    setPixel:  (x: number, y: number, rgba: Readonly<RGBA>) => void;

    constructor(width: number, height: number, pixels: Uint8Array | Uint16Array) {
        const w           = width;
        const sixteenBits = pixels instanceof Uint16Array;
        const divider     = sixteenBits? 65535.0: 255.0;
        const mask        = sixteenBits? 0xffff: 0xff;

        this.width  = width;
        this.height = height;

        this.getPixel = function(x, y) {
            const position = ((y * w) + x) * 4;

            return {
                r: pixels[position]     / divider,
                g: pixels[position + 1] / divider,
                b: pixels[position + 2] / divider,
                a: pixels[position + 3] / divider
            };
        };

        this.copyPixel = function(x, y, rgba: RGBA): RGBA {
            const position = ((y * w) + x) * 4;
            rgba.r = pixels[position]     / divider;
            rgba.g = pixels[position + 1] / divider;
            rgba.b = pixels[position + 2] / divider;
            rgba.a = pixels[position + 3] / divider;
            return rgba;
        };

        this.setPixel = function(x, y, rgba: Readonly<RGBA>): void {
            const position       = ((y * w) + x) * 4;
            pixels[position]     = (rgba.r * divider) & mask;
            pixels[position + 1] = (rgba.g * divider) & mask;
            pixels[position + 2] = (rgba.b * divider) & mask;
            pixels[position + 3] = (rgba.a * divider) & mask;
        };
    }

    get hasPalette(): boolean {
        return false;
    }
}
