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

import { Chunk, ChunkHeader, ColorType } from "./Chunk";

export class ChunkSignificantBits extends Chunk {
    r?: number;
    g?: number;
    b?: number;
    a?: number;

    constructor(r: number | undefined, g: number | undefined, b: number | undefined, a: number | undefined) {
        super("sBIT");
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkSignificantBits {
        if (header.colorType === ColorType.Grayscale)
            return new ChunkSignificantBits(undefined, view.getUint8(offset), undefined, undefined);
        else if (header.colorType === ColorType.GrayscaleAlpha)
            return new ChunkSignificantBits(undefined, view.getUint8(offset), undefined, view.getUint8(offset + 1));
        else if (header.colorType === ColorType.RGB || header.colorType === ColorType.Palette)
            return new ChunkSignificantBits(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), undefined);
        else if (header.colorType === ColorType.RGBA)
            return new ChunkSignificantBits(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
        else
            throw new Error("Unsupported color type");
    }

    chunkComputeLength(header: ChunkHeader): number {
        if (header.colorType === ColorType.Grayscale)
            return 1;
        else if (header.colorType === ColorType.GrayscaleAlpha)
            return 2;
        else if (header.colorType === ColorType.RGB || header.colorType === ColorType.Palette)
            return 3;
        else if (header.colorType === ColorType.RGBA)
            return 4;
        else
            throw new Error("Unsupported color type");
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        if (header.colorType === ColorType.Grayscale) {
            view.setUint8(offset, this.g!);
        }
        else if (header.colorType === ColorType.GrayscaleAlpha) {
            view.setUint8(offset,     this.g!);
            view.setUint8(offset + 1, this.a!);
        }
        else if (header.colorType === ColorType.RGB || header.colorType === ColorType.Palette) {
            view.setUint8(offset,     this.r!);
            view.setUint8(offset + 1, this.g!);
            view.setUint8(offset + 2, this.b!);
        }
        else if (header.colorType === ColorType.RGBA) {
            view.setUint8(offset,     this.r!);
            view.setUint8(offset + 1, this.g!);
            view.setUint8(offset + 2, this.b!);
            view.setUint8(offset + 3, this.a!);
        }
    }

    chunkClone(): ChunkSignificantBits {
        return new ChunkSignificantBits(this.r, this.g, this.b, this.a);
    }
}
