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

import { ColorType, Chunk, ChunkHeader, ChunkPalette, ChunkEnd, ChunkBackground, ChunkPhysicalPixels, ChunkText, ChunkPixelData, ChunkUnknown, PNGUnit } from "./Chunk"

const chunkMap: { [chunkName: string]: typeof Chunk } = {
    "IHDR": ChunkHeader,
    "PLTE": ChunkPalette,
    "IEND": ChunkEnd,
    "bKGD": ChunkBackground,
    "pHYs": ChunkPhysicalPixels,
    "iTXt": ChunkText,
    "IDAT": ChunkPixelData,
};

export interface PNGDelegate {
    chunk?(chunk: Chunk, buffer: ArrayBuffer): void;
}

function isPNGHeader(view: DataView) {
    return view.getUint8(0) === 0x89 &&
           view.getUint8(1) === 0x50 &&
           view.getUint8(2) === 0x4e &&
           view.getUint8(3) === 0x47 &&
           view.getUint8(4) === 0x0d &&
           view.getUint8(5) === 0x0a &&
           view.getUint8(6) === 0x1a &&
           view.getUint8(7) === 0x0a;
}

export class PNGFile {
    private chunks: Chunk[] = [];

    constructor(chunks: Chunk[]) {
        this.chunks = chunks;
    }

    public static parse(buffer: ArrayBuffer, delegate: PNGDelegate): PNGFile {
        const view = new DataView(buffer);

        if (!isPNGHeader(view))
            throw new Error("Not a PNG file: Invalid header");

        let header!: ChunkHeader;
        let offset = 8;
        const chunks: Chunk[] = [];

        while (offset < buffer.byteLength) {
            const length = view.getUint32(offset, false); offset += 4;
            const type   = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)); offset += 4;
            const crc    = view.getUint32(offset + length, false);

            let chunk:  Chunk

            const chunkType = chunkMap[type];
            if (chunkType)
                chunk = new chunkType(length, type, crc, view, offset, header);
            else
                chunk = new ChunkUnknown(length, type, crc, view, offset, header);
            
            if (type === "IHDR")
                header = <ChunkHeader>chunk;

            if (delegate.chunk)
                delegate.chunk(chunk, buffer.slice(offset, offset + length));

            offset += length + 4;
            chunks.push(chunk);
        }

        return new PNGFile(chunks);
    }

    get width(): number {
        return (<ChunkHeader>this.chunks[0]).width;
    }

    get height(): number {
        return (<ChunkHeader>this.chunks[0]).height;
    }

    get colorType(): ColorType {
        return (<ChunkHeader>this.chunks[0]).colorType;
    }

    firstChunk(type: string): Chunk | undefined {
        for (const chunk of this.chunks) {
            if (chunk.type === type)
                return chunk;
        }

        return undefined;
    }

    private dpiFromPhysChunk(): {x: number, y: number} | undefined {
        const chunk = <ChunkPhysicalPixels>this.firstChunk("pHYs");
        if (!chunk)
            return undefined;

        if (chunk.unit !== PNGUnit.Meter)
            return undefined;

        return { x: Math.round(chunk.x / 39.37), y: Math.round(chunk.y / 39.37) };
    }

    private dpiFromText(): {x: number, y: number} | undefined {
        const chunk = <ChunkText>this.firstChunk("iTXt");
        if (!chunk)
            return undefined;

        const buffer = chunk.text;
    }

    get dpi(): {x: number, y: number} | undefined {
        let dpi = this.dpiFromPhysChunk();
        if (dpi)
            return dpi;

        return this.dpiFromText();
    }
};
