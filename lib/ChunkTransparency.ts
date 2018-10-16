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

export class ChunkTransparency extends Chunk {
    alphas: number[] = []

    constructor(alphas: number[]) {
        super("tRNS");
        this.alphas = alphas;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkTransparency {
        const end     = offset + length;
        const divider = ((1 << header.bitDepth) - 1);
        const alphas  = <number[]>[];

        switch (header.colorType) {
        case ColorType.Palette:
            for (; offset < end; offset++)
                alphas.push(view.getUint8(offset) / 255.0);
            break;

        case ColorType.Grayscale:
            alphas.push(view.getUint16(offset, false) / divider);
            break;

        case ColorType.RGB:
            alphas.push(view.getUint16(offset + 0) / divider);
            alphas.push(view.getUint16(offset + 2) / divider);
            alphas.push(view.getUint16(offset + 4) / divider);
            break;

        default:
            throw new Error("Unsupported transparency");
        }

        return new ChunkTransparency(alphas);
    }

    chunkComputeLength(header: ChunkHeader): number {
        switch (header.colorType) {
        case ColorType.Palette:
            return this.alphas.length;

        case ColorType.Grayscale:
            return 2;

        case ColorType.RGB:
            return 6;

        default:
            throw new Error("Unsupported transparency");
        }
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        const divider = ((1 << header.bitDepth) - 1);

        switch (header.colorType) {
        case ColorType.Palette:
            for (const alpha of this.alphas)
                view.setUint8(offset++, alpha * 255.0);
            break;

        case ColorType.Grayscale:
        case ColorType.RGB:
            for (const alpha of this.alphas) {
                view.setUint16(offset, (alpha * divider)|0, false);
                offset += 2;
            }
            break;

        default:
            throw new Error("Unsupported transparency");
        }
    }

    chunkClone(): ChunkTransparency {
        return new ChunkTransparency(this.alphas.slice(0));
    }
}
