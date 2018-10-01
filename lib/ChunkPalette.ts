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

import { Chunk, ChunkHeader } from "./Chunk";
import { ChunkTransparency }  from "./ChunkTransparency";
import { readLatin1String }   from "./Latin1";

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface RGBAFrequency {
    r: number;
    g: number;
    b: number;
    a: number;
    frequency: number;
}

export class ChunkPalette extends Chunk {
    colors: Readonly<RGB>[] = [];

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);

        const colorCount = (length / 3)|0;
        for (let colorIndex = 0; colorIndex < colorCount; colorIndex++, offset += 3) {
            const r = view.getUint8(offset);
            const g = view.getUint8(offset + 1);
            const b = view.getUint8(offset + 2);

            this.colors.push({
                r: r / 255.0,
                g: g / 255.0,
                b: b / 255.0,
            });
        }
    }

    createRGBAPalette(transparency?: ChunkTransparency): ReadonlyArray<RGBA> {
        const rgbaPalette: RGBA[] = [];
        let   index               = 0;
        let   alphas: number[] | undefined;

        if (transparency)
            alphas = transparency.alphas;

        for (const color of this.colors) {
            if (alphas) {
                rgbaPalette.push(Object.freeze({
                    r: color.r,
                    g: color.g,
                    b: color.b,
                    a: index >= alphas.length? 1 : alphas[index],
                }));
            }
            else {
                rgbaPalette.push(Object.freeze({
                    r: color.r,
                    g: color.g,
                    b: color.b,
                    a: 1.0,
                }));
            }

            index++;
        }

        if (index < 256) {
            const transparentPixel = Object.freeze({ r: 0, g: 0, b: 0, a: 0});

            for (; index < 256; index++) {
                rgbaPalette.push(transparentPixel)
            }
        }

        return Object.freeze(rgbaPalette);
    }
}

export class ChunkPaletteHistogram extends Chunk {
    colors: number[] = [];

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);

        const colorCount = (length / 2)|0;
        for (let colorIndex = 0; colorIndex < colorCount; colorIndex++, offset += 2) {
            this.colors.push(view.getUint16(offset, false));
        }
    }
}

export class ChunkPaletteSuggestion extends Chunk {
    name:   string;
    depth:  number;
    colors: Readonly<RGBAFrequency>[] = [];

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);

        const end = offset + length;
        [this.name, offset] = readLatin1String(view, offset, end);
        this.depth = view.getUint8(offset++);

        const pixelSize  = (this.depth / 8)|0;
        const entrySize  = (4 * pixelSize) + 2;
        const colorCount = ((end - offset) / entrySize)|0;

        for (let colorIndex = 0; colorIndex < colorCount; colorIndex++, offset += entrySize) {
            if (pixelSize === 2) {
                this.colors.push({
                    r:         (view.getUint16(offset + 0, false) / 65535.0),
                    g:         (view.getUint16(offset + 2, false) / 65535.0),
                    b:         (view.getUint16(offset + 4, false) / 65535.0),
                    a:         (view.getUint16(offset + 6, false) / 65535.0),
                    frequency:  view.getUint16(offset + 8, false),
                });
            }
            else {
                this.colors.push({
                    r:         (view.getUint8(offset + 0) / 255.0),
                    g:         (view.getUint8(offset + 1) / 255.0),
                    b:         (view.getUint8(offset + 2) / 255.0),
                    a:         (view.getUint8(offset + 3) / 255.0),
                    frequency: view.getUint16(offset + 4, false),
                });
            }
        }
    }
}
