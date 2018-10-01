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
    private readonly pixels: Uint8Array;

    constructor(pixels: ArrayBuffer) {
        this.pixels = new Uint8Array(pixels);
    }

    get(offset: number): number {
        const pos = offset >>> 3;
        const mod = offset % 8;
        return (this.pixels[pos] >>> oneBitsShift[mod]) & 0x1;
    }

    set(offset: number, value: number): void {
        const pos = offset >>> 3;
        const mod = offset % 8;

        let current = this.pixels[pos];
        current &= ~oneBitsMask[mod];
        current |= ((value & 0x1) << oneBitsShift[mod]);
        this.pixels[pos] = current;
    }
}

export class PNGPixelComponentAccess2 implements PNGPixelComponentAccess {
    private readonly pixels: Uint8Array;

    constructor(pixels: ArrayBuffer) {
        this.pixels = new Uint8Array(pixels);
    }

    get(offset: number): number {
        const pos = offset >>> 2;
        const mod = offset % 4;
        return ((this.pixels[pos] >>> twoBitsShift[mod]) & 0x3) / 3.0;
    }

    set(offset: number, value: number): void {
        const pos = offset >>> 2;
        const mod = offset % 4;

        let current = this.pixels[pos];
        current &= ~twoBitsMask[mod];
        current |= ((value * 3.0) & 0x3) << twoBitsShift[mod];
        this.pixels[pos] = current;
    }
}

export class PNGPixelComponentAccess2R implements PNGPixelComponentAccess {
    private readonly pixels: Uint8Array;

    constructor(pixels: ArrayBuffer) {
        this.pixels = new Uint8Array(pixels);
    }

    get(offset: number): number {
        const pos = offset >>> 2;
        const mod = offset % 4;
        return ((this.pixels[pos] >>> twoBitsShift[mod]) & 0x3);
    }

    set(offset: number, value: number): void {
        const pos = offset >>> 2;
        const mod = offset % 4;

        let current = this.pixels[pos];
        current &= ~twoBitsMask[mod];
        current |= (value & 0x3) << twoBitsShift[mod];
        this.pixels[pos] = current;
    }
}

export class PNGPixelComponentAccess4 implements PNGPixelComponentAccess {
    private readonly pixels: Uint8Array;

    constructor(pixels: ArrayBuffer) {
        this.pixels = new Uint8Array(pixels);
    }

    get(offset: number): number {
        if (offset % 2 === 0)
            return (this.pixels[offset >>> 1] >>> 4) / 15.0;
        else
            return (this.pixels[offset >>> 1] & 0xf) / 15.0;
    }
    
    set(offset: number, value: number): void {
        const pos = offset >>> 1;
        const mod = offset % 2;

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
    private readonly pixels: Uint8Array;

    constructor(pixels: ArrayBuffer) {
        this.pixels = new Uint8Array(pixels);
    }

    get(offset: number): number {
        if (offset % 2 === 0)
            return (this.pixels[offset >>> 1] >>> 4);
        else
            return (this.pixels[offset >>> 1] & 0xf);
    }
    
    set(offset: number, value: number): void {
        const pos = offset >>> 1;
        const mod = offset % 2;

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
    private readonly pixels: Uint8Array;

    constructor(pixels: ArrayBuffer) {
        this.pixels = new Uint8Array(pixels);
    }

    get(offset: number): number {
        return this.pixels[offset] / 255.0;
    }
    
    set(offset: number, value: number): void {
        this.pixels[offset] = (value * 255.0) & 0xff;
    }
}

export class PNGPixelComponentAccess8R implements PNGPixelComponentAccess {
    private readonly pixels: Uint8Array;

    constructor(pixels: ArrayBuffer) {
        this.pixels = new Uint8Array(pixels);
    }

    get(offset: number): number {
        return this.pixels[offset];
    }
    
    set(offset: number, value: number): void {
        this.pixels[offset] = value & 0xff;
    }
}

const isLittleEndian = new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x78;

export function networkOrderToNativeOrderUint16(pixels: ArrayBuffer): ArrayBuffer {
    if (!isLittleEndian)
        return pixels;

    const pixels8 = new Uint8Array(pixels);
    const length  = pixels8.byteLength;

    for (let i = 0; i < length; i += 2) {
        const tmp    = pixels8[i];
        pixels8[i]   = pixels8[i+1];
        pixels8[i+1] = tmp;
    }

    return pixels;
}

export class PNGPixelComponentAccess16 implements PNGPixelComponentAccess {
    private readonly pixels: Uint16Array;

    constructor(pixels: ArrayBuffer) {
        this.pixels  = new Uint16Array(pixels);
    }

    get(offset: number): number {
        return this.pixels[offset] / 65535.0;
    }
    
    set(offset: number, value: number): void {
        this.pixels[offset] = (value * 65535.0) & 0xffff;
    }
}
