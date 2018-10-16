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

export class ChunkChromatic extends Chunk {
    whitePointX: number;
    whitePointY: number;
    redX:        number;
    redY:        number;
    greenX:      number;
    greenY:      number;
    blueX:       number;
    blueY:       number;

    constructor(whitePointX: number, whitePointY: number, redX: number, redY: number, greenX: number, greenY: number, blueX: number, blueY: number) {
        super("cHRM");
        this.whitePointX = whitePointX;
        this.whitePointY = whitePointY;
        this.redX        = redX;
        this.redY        = redY;
        this.greenX      = greenX;
        this.greenY      = greenY;
        this.blueX       = blueX;
        this.blueY       = blueY;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkChromatic {
        return new ChunkChromatic(
            view.getUint32(offset,      false),
            view.getUint32(offset +  4, false),
            view.getUint32(offset +  8, false),
            view.getUint32(offset + 12, false),
            view.getUint32(offset + 16, false),
            view.getUint32(offset + 20, false),
            view.getUint32(offset + 24, false),
            view.getUint32(offset + 28, false));
    }

    chunkComputeLength(header: ChunkHeader): number {
        return 32;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        view.setUint32(offset,      this.whitePointX, false);
        view.setUint32(offset +  4, this.whitePointY, false);
        view.setUint32(offset +  8, this.redX,        false);
        view.setUint32(offset + 12, this.redY,        false);
        view.setUint32(offset + 16, this.greenX,      false);
        view.setUint32(offset + 20, this.greenY,      false);
        view.setUint32(offset + 24, this.blueX,       false);
        view.setUint32(offset + 28, this.blueY,       false);
    }

    chunkClone(): ChunkChromatic {
        return new ChunkChromatic(this.whitePointX, this.whitePointY, this.redX, this.redY, this.greenX, this.greenY, this.blueX, this.blueY);
    }
}
