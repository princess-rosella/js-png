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
import { PNGImage,
         computeImageSize } from "./PNGImage";

 /**
  * This array contains the passes index where a pixel is located.
  */
const passes = Object.freeze([
    0, 5, 3, 5, 1, 5, 3, 5,
    6, 6, 6, 6, 6, 6, 6, 6,
    4, 5, 4, 5, 4, 5, 4, 5,
    6, 6, 6, 6, 6, 6, 6, 6,
    2, 5, 3, 5, 2, 5, 3, 5,
    6, 6, 6, 6, 6, 6, 6, 6,
    4, 5, 4, 5, 4, 5, 4, 5,
    6, 6, 6, 6, 6, 6, 6, 6,
]);

const passesX = Object.freeze([
    0, 0, 0, 1, 0, 2, 1, 3,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 0, 1, 1, 2, 2, 3, 3,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 0, 0, 1, 1, 2, 1, 3,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 0, 1, 1, 2, 2, 3, 3,
    0, 1, 2, 3, 4, 5, 6, 7,
]);

const passesY = Object.freeze([
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 1, 0, 1, 0, 1, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 1,
    0, 2, 1, 2, 0, 2, 1, 2,
    2, 2, 2, 2, 2, 2, 2, 2,
    1, 3, 1, 3, 1, 3, 1, 3,
    3, 3, 3, 3, 3, 3, 3, 3,
]);

interface PassInfo {
    readonly x: ReadonlyArray<number>;
    readonly y: ReadonlyArray<number>;
}

const imagePasses: ReadonlyArray<PassInfo> = Object.freeze([
    Object.freeze({
        // pass 1 - 1px
        x: Object.freeze([0]),
        y: Object.freeze([0]),
    }),
    Object.freeze({
        // pass 2 - 1px
        x: Object.freeze([4]),
        y: Object.freeze([0]),
    }),
    Object.freeze({ 
        // pass 3 - 2px
        x: Object.freeze([0, 4]),
        y: Object.freeze([4]),
    }),
    Object.freeze({ 
        // pass 4 - 4px
        x: Object.freeze([2, 6]),
        y: Object.freeze([0, 4]),
    }),
    Object.freeze({ 
        // pass 5 - 8px
        x: Object.freeze([0, 2, 4, 6]),
        y: Object.freeze([2, 6]),
    }),
    Object.freeze({ 
        // pass 6 - 16px
        x: Object.freeze([1, 3, 5, 7]),
        y: Object.freeze([0, 2, 4, 6]),
    }),
    Object.freeze({ 
        // pass 7 - 32px
        x: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]),
        y: Object.freeze([1, 3, 5, 7]),
    }),
]);

export interface ImagePass {
    width:  number;
    height: number;
    pass:   number;
    offset: number;
    length: number;
    end:    number;
}

export function getImagePasses(width: number, height: number, bitDepth: number, componentCount: number): ReadonlyArray<ImagePass> {
    const images: ImagePass[] = [];

    const xLeftOver = width  % 8;
    const yLeftOver = height % 8;
    const xRepeats  = (width  - xLeftOver) / 8;
    const yRepeats  = (height - yLeftOver) / 8;
    let   offset    = 0;

    for (let i = 0; i < imagePasses.length; i++) {
        const pass       = imagePasses[i];
        let   passWidth  = xRepeats * pass.x.length;
        let   passHeight = yRepeats * pass.y.length;

        for (var j = 0; j < pass.x.length; j++) {
            if (pass.x[j] < xLeftOver) {
                passWidth++;
            }
            else {
                break;
            }
        }

        for (j = 0; j < pass.y.length; j++) {
            if (pass.y[j] < yLeftOver) {
                passHeight++;
            }
            else {
                break;
            }
        }

        if (passWidth > 0 && passHeight > 0) {
            const length = computeImageSize(passWidth, passHeight, bitDepth, componentCount);

            images.push(Object.freeze({
                width:  passWidth,
                height: passHeight,
                pass:   i,
                offset: offset,
                length: length,
                end:    offset + length,
            }));

            offset += length;
        }
        else {
            images.push(Object.freeze({
                width:  0,
                height: 0,
                pass:   i,
                offset: offset,
                length: 0,
                end:    offset,
            }));
        }
    }

    return Object.freeze(images);
};

export class PNGImageInterlaced implements PNGImage {
    readonly width:  number;
    readonly height: number;
    readonly images: ReadonlyArray<PNGImage>

    constructor(width: number, height: number, images: PNGImage[]) {
        this.width  = width;
        this.height = height;
        this.images = Object.freeze(images);
    }
    
    private computeCoord(x: number, y: number): [number, number, PNGImage] {
        const xBlock  = (x / 8)|0;
        const yBlock  = (y / 8)|0;
        const xSquare = x % 8;
        const ySquare = y % 8;
        const index   = (ySquare * 8) + xSquare;
        const pass    = passes[index];
        const xp      = passesX[index];
        const yp      = passesY[index];
        const info    = imagePasses[pass];
        const xLength = info.x.length;
        const yLength = info.y.length;

        return [(xBlock * xLength) + xp, (yBlock * yLength) + yp, this.images[pass]];
    }

    getPixel(x: number, y: number): Readonly<RGBA> {
        let dx:    number;
        let dy:    number;
        let image: PNGImage;

        [dx, dy, image] = this.computeCoord(x, y);
        return image.getPixel(dx, dy);
    }
    
    copyPixel(x: number, y: number, rgba: RGBA): RGBA {
        let dx:    number;
        let dy:    number;
        let image: PNGImage;

        [dx, dy, image] = this.computeCoord(x, y);
        return image.copyPixel(dx, dy, rgba);
    }
    
    setPixel(x: number, y: number, rgba: Readonly<RGBA>): void {
        throw new Error("Method not implemented.");
    }

    get hasPalette(): boolean {
        return this.images[0].hasPalette;
    }
}
