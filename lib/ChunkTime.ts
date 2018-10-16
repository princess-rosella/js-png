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

export class ChunkTime extends Chunk {
    year:   number;
    month:  number;
    day:    number;
    hour:   number;
    minute: number;
    second: number;

    constructor(year: number, month: number, day: number, hour: number, minute: number, second: number) {
        super("tIME");
        this.year   = year;
        this.month  = month;
        this.day    = day;
        this.hour   = hour;
        this.minute = minute;
        this.second = second;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader) {
        const year   = view.getUint16(offset, false); offset += 2;
        const month  = view.getUint8(offset++);
        const day    = view.getUint8(offset++);
        const hour   = view.getUint8(offset++);
        const minute = view.getUint8(offset++);
        const second = view.getUint8(offset);
        return new ChunkTime(year, month, day, hour, minute, second);
    }

    chunkComputeLength(header: ChunkHeader): number {
        return 7;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        view.setUint16(offset, this.year, false); offset += 2;
        view.setUint8(offset++, this.month);
        view.setUint8(offset++, this.day);
        view.setUint8(offset++, this.hour);
        view.setUint8(offset++, this.minute);
        view.setUint8(offset++, this.second);
    }

    chunkClone(): ChunkTime {
        return new ChunkTime(this.year, this.month, this.day, this.hour, this.minute, this.second);
    }
}
