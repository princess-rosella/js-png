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

export class ChunkBackground extends Chunk {
    paletteIndex?: number;
    r?: number;
    g?: number;
    b?: number;

    constructor(r: number | undefined, g: number | undefined, b: number | undefined, index: number | undefined) {
        super("bKGD");
        this.r = r;
        this.g = g;
        this.b = b;
        this.paletteIndex = index;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkBackground {
        if (header.colorType === ColorType.Palette)
            return new ChunkBackground(undefined, undefined, undefined, view.getUint8(offset));
        else if (header.colorType === ColorType.Grayscale || header.colorType === ColorType.GrayscaleAlpha)
            return new ChunkBackground(undefined, view.getUint16(offset, false), undefined, undefined);
        else
            return new ChunkBackground(view.getUint16(offset + 0, false), view.getUint16(offset + 2, false), view.getUint16(offset + 4, false), undefined);
    }

    chunkComputeLength(header: ChunkHeader): number {
        if (header.colorType === ColorType.Palette)
            return 1;
        else if (header.colorType === ColorType.Grayscale || header.colorType === ColorType.GrayscaleAlpha)
            return 2;
        else
            return 6;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        if (header.colorType === ColorType.Palette) {
            view.setUint8(offset, this.paletteIndex!);
        }
        else if (header.colorType === ColorType.Grayscale || header.colorType === ColorType.GrayscaleAlpha) {
            view.setUint16(offset, this.g!, false);
        }
        else {
            view.setUint16(offset + 0, this.r!, false);
            view.setUint16(offset + 2, this.g!, false);
            view.setUint16(offset + 4, this.b!, false);
        }
    }

    chunkClone(): ChunkBackground {
        return new ChunkBackground(this.r, this.g, this.b, this.paletteIndex);
    }
}
