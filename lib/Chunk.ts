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

export const enum PNGUnit {
    Unknown = 0,
    Meter   = 1,
}

export class Chunk {
    readonly type: string;
    length:        number;
    crc:           number;

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        this.length = length;
        this.type = type;
        this.crc = crc;
    }
};

export class ChunkUnknown extends Chunk {
    buffer: ArrayBuffer

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);
        this.buffer = view.buffer.slice(offset, offset + length);
    }
}

export class ChunkHeader extends Chunk {
    width:       number;
    height:      number;
    bitDepth:    number;
    colorType:   ColorType;
    compression: number;
    filter:      number;
    interlace:   number;

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);
        this.width       = view.getUint32(offset + 0, false);
        this.height      = view.getUint32(offset + 4, false);
        this.bitDepth    = view.getUint8(offset + 8);
        this.colorType   = <ColorType>view.getUint8(offset + 9);
        this.compression = view.getUint8(offset + 10);
        this.filter      = view.getUint8(offset + 11);
        this.interlace   = view.getUint8(offset + 12);
    }
}

export class ChunkPalette extends Chunk {
}

export class ChunkBackground extends Chunk {
    paletteIndex?: number;
    r?: number;
    g?: number;
    b?: number;

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);

        if (header.colorType === ColorType.Palette) {
            this.paletteIndex = view.getUint8(offset);
        }
        else if (header.colorType === ColorType.Grayscale || header.colorType === ColorType.GrayscaleAlpha) {
            this.g = view.getUint16(offset, false);
        }
        else {
            this.r = view.getUint16(offset + 0, false);
            this.g = view.getUint16(offset + 2, false);
            this.b = view.getUint16(offset + 4, false);
        }
    }
}

export class ChunkPhysicalPixels extends Chunk {
    unit: PNGUnit
    x:    number;
    y:    number;

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);
        this.x    = view.getUint32(offset + 0, false);
        this.y    = view.getUint32(offset + 4, false);
        this.unit = <PNGUnit>view.getUint8(offset + 8);
    }
}

function readLatin1String(view: DataView, offset: number): [string, number] {
    let str = "";

    while (true) {
        const code = view.getUint8(offset++);
        if (code == 0)
            break;

        str += String.fromCharCode(code);
    }

    return [str, offset];
}

export class ChunkText extends Chunk {
    text: ArrayBuffer;
    keyword: string;
    compression?: number;
    lang?: string;
    langKey?: string;

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);

        const end = offset + length;
        [this.keyword, offset] = readLatin1String(view, offset);

        if (type === "iTXt") {
            this.compression = view.getUint8(offset++);
            offset++;
            [this.lang, offset] = readLatin1String(view, offset);
            [this.langKey, offset] = readLatin1String(view, offset);
        }

        this.text = view.buffer.slice(offset, end);
    }
}

export class ChunkEnd extends Chunk {
}

export class ChunkPixelData extends Chunk {
    data: ArrayBuffer;

    constructor(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        super(length, type, crc, view, offset, header);
        this.data = view.buffer.slice(offset, offset + length);
    }
}
