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
import { readLatin1String, writeLatin1String } from "./EncodingLatin1";
import { inflateSync as inflate } from "zlib";

export class ChunkICCProfile extends Chunk {
    name:        string;
    compression: number;
    profile:     ArrayBuffer;

    constructor(name: string, compression: number, profile: ArrayBuffer) {
        super("iCCP");
        this.name        = name;
        this.compression = compression;
        this.profile     = profile;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkICCProfile {
        const end = offset + length;
        let name: string;
        [name, offset] = readLatin1String(view, offset, end);
        let compression = view.getUint8(offset++);

        const buffer  = inflate(view.buffer.slice(offset, end));
        const profile = buffer.buffer.slice(buffer.byteOffset, buffer.byteLength);

        return new ChunkICCProfile(name, compression, profile);
    }

    chunkComputeLength(header: ChunkHeader): number {
        return this.name.length + 2 + this.profile.byteLength;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        offset = writeLatin1String(view, offset, this.name);
        view.setUint8(offset++, this.compression);

        const dest = new Uint8Array(view.buffer, view.byteOffset + offset,this.profile.byteLength);
        const src  = new Uint8Array(this.profile);
        dest.set(src);
    }

    chunkClone(): ChunkICCProfile {
        return new ChunkICCProfile(this.name, this.compression, this.profile);
    }
}
