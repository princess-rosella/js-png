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

import { PNGImageWithPalette }     from "./PNGImage";
import { PNGPixelComponentAccess } from "./PNGPixelComponentAccess"
import { RGBA }                    from "./ChunkPalette";
import { ChunkHeader }             from "./Chunk";
import { ChunkTransparency }       from "./ChunkTransparency";

export class PNGImageIndexed implements PNGImageWithPalette {
    width:        number;
    height:       number;
    pixelsAccess: PNGPixelComponentAccess;
    header:       ChunkHeader;

    getPixel:  (x: number, y: number) => Readonly<RGBA>;
    copyPixel: (x: number, y: number, rgba: RGBA) => RGBA;
    setPixel:  (x: number, y: number, rgba: Readonly<RGBA>) => void;

    getIndex: (x: number, y: number) => number;
    setIndex: (x: number, y: number, index: number) => void;

    readonly palette: ReadonlyArray<RGBA>;

    constructor(header: ChunkHeader, width: number, height: number, widthLine: number, pixels: PNGPixelComponentAccess, palette: ReadonlyArray<RGBA>, transparency?: ChunkTransparency) {
        const w = widthLine;

        this.width        = width;
        this.height       = height;
        this.palette      = palette;
        this.pixelsAccess = pixels;
        this.header       = header;

        const rgbaPalette = palette;

        this.getPixel = function(x, y) {
            return rgbaPalette[pixels.get((y * w) + x)];
        };

        this.copyPixel = function(x, y, rgba: RGBA): RGBA {
            return Object.assign(rgba, rgbaPalette[pixels.get((y * w) + x)]);
        };

        this.setPixel = function(x, y, rgba: Readonly<RGBA>): void {
            const index = rgbaPalette.findIndex((e) => { return e === rgba });
            if (index < 0)
                throw new Error("Indexed images need to reuse same color instances");

            pixels.set((y * w) + x, index);
        };

        this.getIndex = function(x, y) {
            return pixels.get((y * w) + x);
        };

        this.setIndex = function(x, y, index) {
            pixels.set((y * w) + x, index);
        };
    }

    get hasPalette(): boolean {
        return true;
    }

    get pixels(): Uint8Array | DataView {
        return this.pixelsAccess.pixels;     
    }
}
