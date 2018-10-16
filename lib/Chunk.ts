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

export const enum ColorType {
    Grayscale      = 0,
    RGB            = 2,
    Palette        = 3,
    GrayscaleAlpha = 4,
    RGBA           = 6,
}

export const enum InterlaceType {
    None = 0,
    Adam7 = 1
}

export const enum PNGUnit {
    Unknown = 0,
    Meter   = 1,
}

export class Chunk {
    readonly type: string;

    constructor(type: string) {
        this.type = type;
    }

    chunkComputeLength(header: ChunkHeader): number {
        throw new Error("Pure virtual");
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {   
        throw new Error("Pure virtual");
    }

    chunkClone(): Chunk {   
        throw new Error("Pure virtual");
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): Chunk {
        throw new Error("Not implemented");
    }
}

export class ChunkUnknown extends Chunk {
    buffer: ArrayBuffer

    constructor(type: string, buffer: ArrayBuffer) {
        super(type);
        this.buffer = buffer;
    }

    chunkClone(): ChunkUnknown {
        return new ChunkUnknown(this.type, this.buffer.slice(0));
    }

    chunkComputeLength(header: ChunkHeader): number {
        return this.buffer.byteLength;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {   
        const dest = new Uint8Array(view.buffer, view.byteOffset + offset, view.byteLength);
        const src  = new Uint8Array(this.buffer);
        dest.set(src);
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkUnknown {
        return new ChunkUnknown(type, view.buffer.slice(offset, offset + length));
    }
}

export class ChunkHeader extends Chunk {
    width:       number;
    height:      number;
    bitDepth:    number;
    colorType:   ColorType;
    compression: number;
    filter:      number;
    interlace:   InterlaceType;

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkHeader {
        return new ChunkHeader(
            view.getUint32(offset + 0, false), // width
            view.getUint32(offset + 4, false), // height
            view.getUint8(offset + 8), // bitDepth
            <ColorType>view.getUint8(offset + 9), // colorType
            view.getUint8(offset + 10), // compresson
            view.getUint8(offset + 11), // filter
            view.getUint8(offset + 12), // interlace
        );
    }

    public constructor(width: number, height: number, bitDepth: number = 8, colorType: ColorType = ColorType.RGBA, compression: number = 0, filter: number = 0, interlace: InterlaceType = InterlaceType.None) {
        super("IHDR");
        this.width       = width;
        this.height      = height;
        this.bitDepth    = bitDepth;
        this.colorType   = colorType;
        this.compression = compression;
        this.filter      = filter;
        this.interlace   = interlace;
    }

    chunkClone(): ChunkHeader {
        return new ChunkHeader(this.width, this.height, this.bitDepth, this.colorType, this.compression, this.filter, this.interlace);
    }

    chunkComputeLength(header: ChunkHeader): number {
        return 13;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        view.setUint32(offset + 0,  this.width, false);
        view.setUint32(offset + 4,  this.height, false);
        view.setUint8 (offset + 8,  this.bitDepth);
        view.setUint8 (offset + 9,  this.colorType);
        view.setUint8 (offset + 10, this.compression);
        view.setUint8 (offset + 11, this.filter);
        view.setUint8 (offset + 12, this.interlace);
    }
}

export class ChunkEnd extends Chunk {
    public constructor() {
        super("IEND");
    }

    chunkComputeLength(header: ChunkHeader): number {
        return 0;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
    }

    chunkClone(): ChunkEnd {
        return this;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): Chunk {
        return new ChunkEnd();
    }
}

export class ChunkPixelData extends Chunk {
    data: ArrayBuffer;

    constructor(data: ArrayBuffer) {
        super("IDAT");
        this.data = data;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        return new ChunkPixelData(view.buffer.slice(offset, offset + length));
    }

    chunkComputeLength(header: ChunkHeader): number {
        return this.data.byteLength;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {   
        const dest = new Uint8Array(view.buffer, view.byteOffset + offset, view.byteLength);
        const src  = new Uint8Array(this.data);
        dest.set(src);
    }

    chunkClone(): ChunkEnd {
        return this;
    }
}
