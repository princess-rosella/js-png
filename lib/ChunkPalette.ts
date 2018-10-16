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
import { readLatin1String, writeLatin1String } from "./EncodingLatin1";

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
    colors: Readonly<RGB>[];

    constructor(colors: Readonly<RGB>[]) {
        super("PLTE");
        this.colors = colors;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkPalette {
        const colorCount = (length / 3)|0;
        const colors: RGB[] = [];
        for (let colorIndex = 0; colorIndex < colorCount; colorIndex++, offset += 3) {
            const r = view.getUint8(offset);
            const g = view.getUint8(offset + 1);
            const b = view.getUint8(offset + 2);

            colors.push({
                r: r / 255.0,
                g: g / 255.0,
                b: b / 255.0,
            });
        }

        return new ChunkPalette(colors);
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

    chunkComputeLength(header: ChunkHeader): number {
        return this.colors.length * 3;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        for (const color of this.colors) {
            view.setUint8(offset++, (color.r * 255)|0);
            view.setUint8(offset++, (color.g * 255)|0);
            view.setUint8(offset++, (color.b * 255)|0);
        }
    }

    chunkClone(): ChunkPalette {
        return new ChunkPalette(this.colors.slice(0));
    }
}

export class ChunkPaletteHistogram extends Chunk {
    colors: number[];

    constructor(colors: number[]) {
        super("hIST");
        this.colors = colors;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkPaletteHistogram {
        const colorCount = (length / 2)|0;
        const colors: number[] = [];
        for (let colorIndex = 0; colorIndex < colorCount; colorIndex++, offset += 2) {
            colors.push(view.getUint16(offset, false));
        }

        return new ChunkPaletteHistogram(colors);
    }

    chunkComputeLength(header: ChunkHeader): number {
        return this.colors.length * 2;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        for (const color of this.colors) {
            view.setUint16(offset, color, false);
            offset += 2;
        }
    }

    chunkClone(): ChunkPaletteHistogram {
        return new ChunkPaletteHistogram(this.colors.slice(0));
    }
}

export class ChunkPaletteSuggestion extends Chunk {
    name:   string;
    depth:  number;
    colors: Readonly<RGBAFrequency>[] = [];

    constructor(name: string, depth: number, colors: Readonly<RGBAFrequency>[]) {
        super("sPLT");
        this.name   = name;
        this.depth  = depth;
        this.colors = colors;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkPaletteSuggestion {
        const end = offset + length;
        let name: string;
        [name, offset] = readLatin1String(view, offset, end);

        const depth      = view.getUint8(offset++);
        const pixelSize  = (depth / 8)|0;
        const entrySize  = (4 * pixelSize) + 2;
        const colorCount = ((end - offset) / entrySize)|0;
        const colors: Readonly<RGBAFrequency>[] = [];

        for (let colorIndex = 0; colorIndex < colorCount; colorIndex++, offset += entrySize) {
            if (pixelSize === 2) {
                colors.push({
                    r:         (view.getUint16(offset + 0, false) / 65535.0),
                    g:         (view.getUint16(offset + 2, false) / 65535.0),
                    b:         (view.getUint16(offset + 4, false) / 65535.0),
                    a:         (view.getUint16(offset + 6, false) / 65535.0),
                    frequency:  view.getUint16(offset + 8, false),
                });
            }
            else {
                colors.push({
                    r:         (view.getUint8(offset + 0) / 255.0),
                    g:         (view.getUint8(offset + 1) / 255.0),
                    b:         (view.getUint8(offset + 2) / 255.0),
                    a:         (view.getUint8(offset + 3) / 255.0),
                    frequency: view.getUint16(offset + 4, false),
                });
            }
        }

        return new ChunkPaletteSuggestion(name, depth, colors);
    }

    chunkComputeLength(header: ChunkHeader): number {
        const pixelSize  = (this.depth / 8)|0;
        const entrySize  = (4 * pixelSize) + 2;

        return 1 +                    // depth
               this.name.length + 1 + // name
               entrySize * this.colors.length;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        const pixelSize  = (this.depth / 8)|0;
        const entrySize  = (4 * pixelSize) + 2;

        offset = writeLatin1String(view, offset, this.name);
        view.setUint8(offset++, this.depth);

        for (const color of this.colors) {
            if (pixelSize === 2) {
                view.setUint16(offset + 0, (color.r * 65535)|0, false);
                view.setUint16(offset + 2, (color.g * 65535)|0, false);
                view.setUint16(offset + 4, (color.b * 65535)|0, false);
                view.setUint16(offset + 6, (color.a * 65535)|0, false);
                view.setUint16(offset + 8, color.frequency,     false);
            }
            else {
                view.setUint8 (offset + 0, (color.r * 255)|0);
                view.setUint8 (offset + 1, (color.g * 255)|0);
                view.setUint8 (offset + 2, (color.b * 255)|0);
                view.setUint8 (offset + 3, (color.a * 255)|0);
                view.setUint16(offset + 4, color.frequency,   false);
            }

            offset += entrySize;
        }
    }

    chunkClone(): ChunkPaletteSuggestion {
        return new ChunkPaletteSuggestion(this.name, this.depth, this.colors.slice(0));
    }
}
