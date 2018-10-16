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

import { inflateSync as inflate, deflateSync as deflate } from "zlib";
import { Chunk, ChunkHeader } from "./Chunk";
import { readLatin1String, writeLatin1String, isLatin1 } from "./EncodingLatin1";
import { readLatin1OrUtf8String, lengthUtf8String, writeUtf8String } from "./EncodingUTF8";

export class ChunkText extends Chunk {
    keyword:           string;
    compression?:      number;
    lang?:             string;
    keywordLocalized?: string;
    textCompressed?:   ArrayBuffer;

    private textI: string;

    constructor(type: string, keyword: string, text: string, compression?: number, lang?: string, keywordLocalized?: string, textCompressed?: ArrayBuffer) {
        super(type);
        this.keyword          = keyword;
        this.textI            = text;
        this.compression      = compression;
        this.lang             = lang;
        this.keywordLocalized = keywordLocalized;
        this.textCompressed   = textCompressed;
    }

    static parse(length: number, type: string, crc: number, view: DataView, offset: number, header: ChunkHeader): ChunkText {
        let keyword: string | undefined;
        let lang: string | undefined;
        let text: string;
        let compression: number | undefined;
        let keywordLocalized: string | undefined;
        let textCompressed: ArrayBuffer | undefined;

        const end = offset + length;
        [keyword, offset] = readLatin1String(view, offset, end);

        if (type === "iTXt") {
            compression = view.getUint8(offset++);
            offset++;
            [lang,             offset] = readLatin1String(view, offset, end);
            [keywordLocalized, offset] = readLatin1OrUtf8String(view, offset, end);

            if (compression === 0) {
                [text, offset] = readLatin1OrUtf8String(view, offset, end);
            }
            else if (compression === 1) {
                textCompressed = view.buffer.slice(offset, end);
                const buffer   = inflate(textCompressed);
                [text, ] = readLatin1OrUtf8String(new DataView(buffer.buffer), buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            }
            else
                throw new Error("Unsupported text fragment");
        }
        else if (type === "tEXt") {
            [text, offset] = readLatin1String(view, offset, end);
        }
        else if (type === "zTXt") {
            compression    = view.getUint8(offset++);
            textCompressed = view.buffer.slice(offset, end);
            const buffer        = inflate(textCompressed);
            [text, ]      = readLatin1String(new DataView(buffer.buffer), buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }
        else
            throw new Error("Unsupported text fragment");

        return new ChunkText(type, keyword, text, compression, lang, keywordLocalized, textCompressed);
    }

    get isCompressed(): boolean {
        if (this.type === "zTXt")
            return true;
        else if (this.compression === 1)
            return true;

        return false;
    }

    get text(): string {
        return this.textI;
    }

    set text(newValue: string) {
        if (this.textI === newValue)
            return;

        this.text = newValue;

        if (this.isCompressed)
            this.regenerateCompressedText();
    }

    private regenerateCompressedText() {
        const latin1 = (this.type !== "iTXT") && isLatin1(this.textI);
        let   length = 0;

        if (latin1)
            length = this.textI.length;
        else
            length = lengthUtf8String(this.textI);

        const view = new DataView(new ArrayBuffer(length));

        if (latin1)
            writeLatin1String(view, 0, this.textI, false);
        else
            writeUtf8String(view, 0, this.textI, false);

        const buffer = deflate(view.buffer, { level: 9 });
        this.textCompressed = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    chunkComputeLength(header: ChunkHeader): number {
        const type   = this.type;
        let   length = this.keyword.length + 1;

        if (type === "iTXt") {
            length += 2; // compression
            length += this.lang!.length + 1;

            if (this.keywordLocalized)
                length += lengthUtf8String(this.keywordLocalized) + 1;
            else
                length++;

            if (this.compression === 0) {
                length += lengthUtf8String(this.textI);
            }
            else if (this.compression === 1) {
                length += this.textCompressed!.byteLength;
            }
        }
        else if (type === "tEXt") {
            length += this.textI.length;
        }
        else if (type === "zTXt") {
            length += 1; // compression
            length += this.textCompressed!.byteLength;
        }

        return length;
    }

    chunkSave(header: ChunkHeader, view: DataView, offset: number): void {
        const type = this.type;

        offset = writeLatin1String(view, offset, this.keyword);

        if (type === "iTXt") {
            view.setUint8(offset++, this.compression!);
            offset++;
            offset = writeLatin1String(view, offset, this.lang!);
            offset = writeUtf8String(view, offset, this.keywordLocalized!);

            if (this.compression === 0) {
                offset = writeUtf8String(view, offset, this.textI, false);
                return;
            }
            else if (this.compression === 1) {
                (new Uint8Array(view.buffer, view.byteOffset + offset, this.textCompressed!.byteLength)).set(new Uint8Array(this.textCompressed!));
                return;
            }
        }
        else if (type === "tEXt") {
            offset = writeLatin1String(view, offset, this.textI, false);
            return;
        }
        else if (type === "zTXt") {
            view.setUint8(offset++, this.compression!);
            (new Uint8Array(view.buffer, view.byteOffset + offset, this.textCompressed!.byteLength)).set(new Uint8Array(this.textCompressed!));
            return;
        }
    }

    chunkClone(): ChunkText {
        return new ChunkText(this.type, this.keyword, this.textI, this.compression, this.lang, this.keywordLocalized, this.textCompressed);
    }
}
