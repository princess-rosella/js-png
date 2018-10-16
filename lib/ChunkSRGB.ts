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

export const enum RenderingIntent {
    Perceptual           = 0,
    RelativeColorimetric = 1,
    Saturation           = 2,
    AbsoluteColorimetric = 3,
}

export class ChunkSRGB extends Chunk {
    renderingIntent: RenderingIntent;

    constructor(renderingIntent: RenderingIntent) {
        super("sRGB");
        this.renderingIntent = renderingIntent;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkSRGB {
        return new ChunkSRGB(<RenderingIntent>view.getUint8(offset));
    }

    chunkComputeLength(header: ChunkHeader): number {
        return 1;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        view.setUint8(offset, this.renderingIntent);
    }

    chunkClone(): ChunkSRGB {
        return new ChunkSRGB(this.renderingIntent);
    }
}
