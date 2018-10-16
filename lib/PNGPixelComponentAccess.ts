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

export interface PNGPixelComponentAccess {
    readonly pixels: Uint8Array | DataView;

    get(offset: number): number;
    set(offset: number, value: number): void;
}

const oneBitsMask = [
    0x80,
    0x40,
    0x20,
    0x10,
    0x08,
    0x04,
    0x02,
    0x01,
];

const oneBitsShift = [
    7,
    6,
    5,
    4,
    3,
    2,
    1,
    0,
];

const twoBitsMask = [
    0xC0,
    0x30,
    0x0C,
    0x03,
];

const twoBitsShift = [
    6,
    4,
    2,
    0,
];

export class PNGPixelComponentAccess1 implements PNGPixelComponentAccess {
    readonly pixels: Uint8Array;
    private readonly width: number;

    constructor(pixels: Uint8Array, width: number) {
        this.pixels = pixels;
        this.width  = width;
    }

    get(offset: number): number {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 3);
        const mod         = offset % 8;

        return (this.pixels[pos] >>> oneBitsShift[mod]) & 0x1;
    }

    set(offset: number, value: number): void {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 3);
        const mod         = offset % 8;

        let current = this.pixels[pos];
        current &= ~oneBitsMask[mod];
        current |= ((value & 0x1) << oneBitsShift[mod]);
        this.pixels[pos] = current;
    }
}

export class PNGPixelComponentAccess2 implements PNGPixelComponentAccess {
    readonly pixels: Uint8Array;
    private readonly width: number;

    constructor(pixels: Uint8Array, width: number) {
        this.pixels = pixels;
        this.width  = width;
    }

    get(offset: number): number {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 2);
        const mod         = offset % 4;

        return ((this.pixels[pos] >>> twoBitsShift[mod]) & 0x3) / 3.0;
    }

    set(offset: number, value: number): void {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 2);
        const mod         = offset % 4;

        let current = this.pixels[pos];
        current &= ~twoBitsMask[mod];
        current |= ((value * 3.0) & 0x3) << twoBitsShift[mod];
        this.pixels[pos] = current;
    }
}

export class PNGPixelComponentAccess2R implements PNGPixelComponentAccess {
    readonly pixels: Uint8Array;
    private readonly width: number;

    constructor(pixels: Uint8Array, width: number) {
        this.pixels = pixels;
        this.width  = width;
    }

    get(offset: number): number {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 2);
        const mod         = offset % 4;
        return ((this.pixels[pos] >>> twoBitsShift[mod]) & 0x3);
    }

    set(offset: number, value: number): void {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 2);
        const mod         = offset % 4;

        let current = this.pixels[pos];
        current &= ~twoBitsMask[mod];
        current |= (value & 0x3) << twoBitsShift[mod];
        this.pixels[pos] = current;
    }
}

export class PNGPixelComponentAccess4 implements PNGPixelComponentAccess {
    readonly pixels: Uint8Array;
    private readonly width:  number;

    constructor(pixels: Uint8Array, width: number) {
        this.pixels = pixels;
        this.width  = width;
    }

    get(offset: number): number {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 1);

        if (offset % 2 === 0)
            return (this.pixels[pos] >>> 4) / 15.0;
        else
            return (this.pixels[pos] & 0xf) / 15.0;
    }
    
    set(offset: number, value: number): void {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 1);
        const mod         = offset % 2;

        let current = this.pixels[pos];

        if (mod === 0) {
            current &= 0x0f;
            current |= (((value * 15.0) & 0xf) << 4);
        }
        else {
            current &= 0xf0;
            current |= ((value * 15.0) & 0xf);
        }

        this.pixels[pos] = current;
    }
}

export class PNGPixelComponentAccess4R implements PNGPixelComponentAccess {
    readonly pixels: Uint8Array;
    private readonly width:  number;

    constructor(pixels: Uint8Array, width: number) {
        this.pixels = pixels;
        this.width  = width;
    }

    get(offset: number): number {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 1);

        if (offset % 2 === 0)
            return (this.pixels[pos] >>> 4);
        else
            return (this.pixels[pos] & 0xf);
    }
    
    set(offset: number, value: number): void {
        const filterBytes = 1 + (offset / this.width)|0;
        const pos         = filterBytes + (offset >>> 1);
        const mod         = offset % 2;

        let current = this.pixels[pos];

        if (mod === 0) {
            current &= 0x0f;
            current |= ((value & 0xf) << 4);
        }
        else {
            current &= 0xf0;
            current |= (value & 0xf);
        }

        this.pixels[pos] = current;
    }
}

export class PNGPixelComponentAccess8 implements PNGPixelComponentAccess {
    readonly pixels: Uint8Array;
    private readonly width:  number;

    constructor(pixels: Uint8Array, width: number) {
        this.pixels = pixels;
        this.width  = width;
    }

    get(offset: number): number {
        const filterBytes = 1 + (offset / this.width)|0;
        return this.pixels[filterBytes + offset] / 255.0;
    }
    
    set(offset: number, value: number): void {
        const filterBytes = 1 + (offset / this.width)|0;
        this.pixels[filterBytes + offset] = (value * 255.0) & 0xff;
    }
}

export class PNGPixelComponentAccess8R implements PNGPixelComponentAccess {
    readonly pixels: Uint8Array;
    private readonly width:  number;

    constructor(pixels: Uint8Array, width: number) {
        this.pixels = pixels;
        this.width  = width;
    }

    get(offset: number): number {
        const filterBytes = 1 + (offset / this.width)|0;
        return this.pixels[filterBytes + offset];
    }
    
    set(offset: number, value: number): void {
        const filterBytes = 1 + (offset / this.width)|0;
        this.pixels[filterBytes + offset] = value & 0xff;
    }
}

export class PNGPixelComponentAccess16 implements PNGPixelComponentAccess {
    readonly pixels: DataView;
    private readonly width:  number;

    constructor(pixels: DataView, width: number) {
        this.pixels = pixels;
        this.width  = width;
    }

    get(offset: number): number {
        const filterBytes = 1 + (offset / this.width)|0;
        return this.pixels.getUint16(filterBytes + (offset << 1)) / 65535.0;
    }
    
    set(offset: number, value: number): void {
        const filterBytes = 1 + (offset / this.width)|0;
        this.pixels.setUint16(filterBytes + (offset << 1), (value * 65535.0) & 0xffff);
    }
}
