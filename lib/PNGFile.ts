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

import { ColorType, Chunk, ChunkHeader, ChunkEnd, ChunkPixelData, ChunkUnknown, PNGUnit, InterlaceType } from "./Chunk"

import { ChunkBackground }        from "./ChunkBackground";
import { ChunkChromatic }         from "./ChunkChromatic";
import { ChunkGamma }             from "./ChunkGamma";
import { ChunkICCProfile }        from "./ChunkICCProfile";
import { ChunkPhysicalPixels }    from "./ChunkPhysicalPixels";
import { ChunkSignificantBits }   from "./ChunkSignificantBits";
import { ChunkText }              from "./ChunkText";
import { ChunkTime }              from "./ChunkTime";
import { ChunkTransparency }      from "./ChunkTransparency";
import { ChunkSRGB }              from "./ChunkSRGB";
import { ChunkPalette,
         ChunkPaletteHistogram,
         ChunkPaletteSuggestion, 
         RGBA }                   from "./ChunkPalette";

import { inflateSync, deflateSync } from "zlib";
import { unfilter1, unfilter2, unfilter3, unfilter4 } from "./Filter";
import { crc32 } from "./CRC";

import { PNGImage,
         computeLineByteWidth,
         computeImageSize,
         computeLinePixelWidth }           from "./PNGImage";
import { PNGImageIndexed }                 from "./PNGImageIndexed";
import { PNGImageGray, PNGImageGrayAlpha } from "./PNGImageGray";
import { PNGImageRGB,  PNGImageRGBA }      from "./PNGImageRGB";

import { PNGPixelComponentAccess,
         PNGPixelComponentAccess1,
         PNGPixelComponentAccess2,
         PNGPixelComponentAccess2R,
         PNGPixelComponentAccess4,
         PNGPixelComponentAccess4R,
         PNGPixelComponentAccess8,
         PNGPixelComponentAccess8R,
         PNGPixelComponentAccess16 } from "./PNGPixelComponentAccess";
import { PNGImageInterlaced, getImagePasses, ImagePass } from "./PNGImageInterlaced";

const chunkMap: Readonly<{ [chunkName: string]: typeof Chunk.parse }> = Object.freeze({
    "bKGD": ChunkBackground.parse,
    "cHRM": ChunkChromatic.parse,
    "IEND": ChunkEnd.parse,
    "gAMA": ChunkGamma.parse,
    "IHDR": ChunkHeader.parse,
    "iCCP": ChunkICCProfile.parse,
    "PLTE": ChunkPalette.parse,
    "hIST": ChunkPaletteHistogram.parse,
    "sPLT": ChunkPaletteSuggestion.parse,
    "pHYs": ChunkPhysicalPixels.parse,
    "IDAT": ChunkPixelData.parse,
    "iTXt": ChunkText.parse,
    "tEXt": ChunkText.parse,
    "zTXt": ChunkText.parse,
    "tIME": ChunkTime.parse,
    "tRNS": ChunkTransparency.parse,
    "sBIT": ChunkSignificantBits.parse,
    "sRGB": ChunkSRGB.parse,
});

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

function inflate(buffer: ArrayBuffer): DataView {
    const pixelsBuffer = inflateSync(buffer);
    return new DataView(pixelsBuffer.buffer, pixelsBuffer.byteOffset, pixelsBuffer.byteLength);
}

export class PNGFile {
    chunks: Chunk[] = [];

    private constructor(chunks: Chunk[]) {
        this.chunks = chunks;
    }

    public static create(header: ChunkHeader, palette?: ChunkPalette, transparency?: ChunkTransparency): PNGFile {
        const chunks = [];

        chunks.push(header);
        
        if (palette)
            chunks.push(palette);

        if (transparency)
            chunks.push(transparency);

        chunks.push(new ChunkEnd());
        return new PNGFile(chunks);
    }

    public static parse(buffer: ArrayBuffer, delegate?: PNGDelegate): PNGFile {
        const view = new DataView(buffer);

        if (!isPNGHeader(view))
            throw new Error("Not a PNG file: Invalid header");

        let header!: Readonly<ChunkHeader>;
        let offset = 8;
        const chunks: Chunk[] = [];

        while (offset < buffer.byteLength) {
            const length = view.getUint32(offset, false); offset += 4;
            const type   = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)); offset += 4;
            const crc    = view.getUint32(offset + length, false);

            let chunk:  Chunk

            const chunkType = chunkMap[type];
            if (chunkType)
                chunk = chunkType(length, type, crc, view, offset, header);
            else
                chunk = ChunkUnknown.parse(length, type, crc, view, offset, header);
            
            if (type === "IHDR")
                header = Object.freeze(<ChunkHeader>chunk);

            if (delegate && delegate.chunk)
                delegate.chunk(chunk, buffer.slice(offset, offset + length));

            offset += length + 4;
            chunks.push(chunk);
        }

        return new PNGFile(chunks);
    }

    public toArrayBuffer(): ArrayBuffer {
        const header            = <ChunkHeader>this.chunks[0];
        const lengths: number[] = [];
        let   totalLength       = 8;

        for (const chunk of this.chunks) {
            const length = chunk.chunkComputeLength(header);
            totalLength += (length + 12);
            lengths.push(length);
        }

        const buffer = new ArrayBuffer(totalLength);
        let   offset = 8;

        {
            const signature = new Uint8Array(buffer, 0, 8);
            signature[0] = 0x89;
            signature[1] = 0x50;
            signature[2] = 0x4E;
            signature[3] = 0x47;
            signature[4] = 0x0D;
            signature[5] = 0x0A;
            signature[6] = 0x1A;
            signature[7] = 0x0A;
        }

        for (const chunk of this.chunks) {
            const length = lengths.shift()!;
            const view   = new DataView(buffer, offset, length + 12);
            const data   = new Uint8Array(buffer, offset + 4, length + 4);
            const type   = chunk.type;

            chunk.chunkSave(header, view, 8);
            view.setUint32(0, length);
            view.setUint8 (4, type.charCodeAt(0));
            view.setUint8 (5, type.charCodeAt(1));
            view.setUint8 (6, type.charCodeAt(2));
            view.setUint8 (7, type.charCodeAt(3));
            view.setUint32(length + 8, crc32(data));

            offset += length + 12;
        }

        return buffer;
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

    get interlace(): number {
        return (<ChunkHeader>this.chunks[0]).interlace;
    }

    get bitDepth(): number {
        return (<ChunkHeader>this.chunks[0]).bitDepth;
    }

    firstChunk(type: string): Chunk | undefined {
        for (const chunk of this.chunks) {
            if (chunk.type === type)
                return chunk;
        }

        return undefined;
    }

    firstText(keyword: string): ChunkText | undefined {
        for (const chunk of this.chunks) {
            if (chunk instanceof ChunkText) {
                if (chunk.keyword === keyword)
                    return chunk;
            }
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
        const chunk = this.firstText("XML:com.adobe.xmp");
        if (!chunk)
            return undefined;

        const text = chunk.text;
        const xResolutionPattern = /<\s*(tiff\:)?XResolution\s*>\s*(\d+)\s*<\s*\/\s*(tiff\:)XResolution\s*>/m;
        const yResolutionPattern = /<\s*(tiff\:)?YResolution\s*>\s*(\d+)\s*<\s*\/\s*(tiff\:)YResolution\s*>/m;

        let xMatches = xResolutionPattern.exec(text);
        let yMatches = yResolutionPattern.exec(text);
        if (xMatches && yMatches)
            return { x: parseInt(xMatches[2]), y: parseInt(yMatches[2]) };

        return undefined;
    }

    get dpi(): {x: number, y: number} | undefined {
        let dpi = this.dpiFromPhysChunk();
        if (dpi)
            return dpi;

        return this.dpiFromText();
    }

    get componentCount(): number {
        switch (this.colorType) {
        case ColorType.Palette:
        case ColorType.Grayscale:
            return 1;
        case ColorType.GrayscaleAlpha:
            return 2;
        case ColorType.RGB:
            return 3;
        case ColorType.RGBA:
            return 4;
        }

        throw new Error(`Unsupported color type: ${this.colorType}`);
    }

    get pixelSize(): number {
        if (this.bitDepth < 8)
            return 1;
        else if (this.bitDepth === 8)
            return this.componentCount;
        else if (this.bitDepth === 16)
            return this.componentCount << 1;

        throw new Error(`Invalid bit depth: ${this.bitDepth}`);
    }

    private createPixelAccess(buffer: Uint8Array, width: number, rawValue: boolean): PNGPixelComponentAccess {
        switch (this.bitDepth) {
        case 1:
            return new PNGPixelComponentAccess1(buffer, width);

        case 2:
            if (rawValue)
                return new PNGPixelComponentAccess2R(buffer, width);
            return new PNGPixelComponentAccess2(buffer, width);

        case 4:
            if (rawValue)
                return new PNGPixelComponentAccess4R(buffer, width);
            return new PNGPixelComponentAccess4(buffer, width);

        case 8:
            if (rawValue)
                return new PNGPixelComponentAccess8R(buffer, width);
            return new PNGPixelComponentAccess8(buffer, width);

        case 16:
            return new PNGPixelComponentAccess16(new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength), width);
        }

        throw new Error(`Invalid bit depth: ${this.bitDepth}`);
    }

    private rawPixels(): DataView | null {
        let coffset = 0;
        let ccount  = 0;
        let clength = 0;

        for (const chunk of this.chunks) {
            if (chunk.type !== "IDAT")
                continue;

            ccount  += 1;
            clength += (<ChunkPixelData>chunk).data.byteLength;
        }

        if (ccount === 0)
            return null;

        const cbuffer = ccount === 1? (<ChunkPixelData>this.firstChunk("IDAT")).data : new ArrayBuffer(clength);

        if (ccount > 1) {
            for (const chunk of this.chunks) {
                if (chunk.type !== "IDAT")
                    continue;

                const source = new Uint8Array((<ChunkPixelData>chunk).data);
                const dest   = new Uint8Array(cbuffer, coffset, source.byteLength);

                dest.set(source);
                coffset += source.byteLength;
            }
        }

        return inflate(cbuffer);
    }

    private static validateBitDepth(colorType: ColorType, bitDepth: number): void {
        switch (bitDepth) {
        case 1:
        case 2:
        case 4:
            if (colorType === ColorType.Palette ||
                colorType === ColorType.Grayscale)
                return;
        case 8:
            return;
        case 16:
            if (colorType !== ColorType.Palette)
                return;
        }

        throw new Error(`Invalid bit depth: ${bitDepth}`);
    }

    public renderImage(): PNGImage {
        let passes: ReadonlyArray<ImagePass>;
        const header         = <ChunkHeader>this.chunks[0];
        const height         = header.height;
        const width          = header.width;
        const bitDepth       = header.bitDepth;
        const componentCount = this.componentCount;
        const colorType      = header.colorType;

        PNGFile.validateBitDepth(colorType, bitDepth);

        if (this.interlace === 1) {
            passes = getImagePasses(width, height, bitDepth, componentCount);
        }
        else {
            const length = computeImageSize(width, height, bitDepth, componentCount);

            passes = [{
                width:  width,
                height: height,
                pass:   0,
                offset: 0,
                length: length,
                end:    length,
            }];
        }

        let pixels = this.rawPixels();

        if (!pixels) {
            let totalLength = 0;

            for (const pass of passes)
                totalLength += ((computeLineByteWidth(pass.width, bitDepth, componentCount) + 1) * pass.height);

            pixels = new DataView(new ArrayBuffer(totalLength));
        }

        const pixelSize          = this.pixelSize;
        const images: PNGImage[] = [];
        const transparencyChunk  = <ChunkTransparency>this.firstChunk("tRNS");
        let   palette: ReadonlyArray<RGBA> | undefined;

        if (colorType === ColorType.Palette)
            palette = (<ChunkPalette>this.firstChunk("PLTE")).createRGBAPalette(transparencyChunk);

        for (const pass of passes) {
            const pixels8         = new Uint8Array(pixels.buffer, pixels.byteOffset + pass.offset, pass.length);
            const lineInBytes     = computeLineByteWidth(pass.width, bitDepth, componentCount);
            const scanLineInBytes = lineInBytes + 1;
            let   offset          = 0;
            let   previousOffset: number | undefined;

            for (let y = 0; y < pass.height; y++, offset += scanLineInBytes) {
                const filterType = pixels8[offset];

                switch (filterType) {
                case 0:
                    break;
                case 1:
                    unfilter1(pixelSize, pixels8, offset + 1, lineInBytes);
                    break;
                case 2:
                    unfilter2(pixels8, offset + 1, previousOffset === undefined? undefined: previousOffset + 1, lineInBytes);
                    break;
                case 3:
                    unfilter3(pixelSize, pixels8, offset + 1, previousOffset === undefined? undefined: previousOffset + 1, lineInBytes);
                    break;
                case 4:
                    unfilter4(pixelSize, pixels8, offset + 1, previousOffset === undefined? undefined: previousOffset + 1, lineInBytes);
                    break;
                default:
                    throw new Error(`Unsupported filter type ${filterType}`);
                }

                pixels8[offset] = 0;
                previousOffset  = offset;
            }

            const pixelsWidth = computeLinePixelWidth(pass.width, bitDepth);

            switch (colorType) {
            case ColorType.Palette:
                images.push(new PNGImageIndexed(header, pass.width, pass.height, pixelsWidth, this.createPixelAccess(pixels8, pixelsWidth, true), palette!));
                break;
            case ColorType.Grayscale:
                images.push(new PNGImageGray(header, pass.width, pass.height, pixelsWidth, this.createPixelAccess(pixels8, pixelsWidth, false), transparencyChunk));
                break;
            case ColorType.GrayscaleAlpha:
                images.push(new PNGImageGrayAlpha(header, pass.width, pass.height, this.createPixelAccess(pixels8, pixelsWidth * 2, false)));
                break;
            case ColorType.RGB:
                images.push(new PNGImageRGB(header, pass.width, pass.height, this.createPixelAccess(pixels8, pixelsWidth * 3, false), transparencyChunk));
                break;
            case ColorType.RGBA:
                images.push(new PNGImageRGBA(header, pass.width, pass.height, this.createPixelAccess(pixels8, pixelsWidth * 4, false)));
                break;
            default:
                throw new Error(`Unsupported color type ${this.colorType}`);
            }
        }

        if (images.length === 1)
            return images[0];

        if (images.length === 7)
            return new PNGImageInterlaced(header, pixels, width, height, images);

        throw new Error(`Unknown interlacing mode: ${images.length}`);
    }

    updateImage(image: PNGImage) {
        let   indexOfFirstPixelData = this.chunks.findIndex((chunk) => chunk.type === "IDAT" || chunk.type === "IEND");
        const newChunks = this.chunks.filter((chunk) => chunk.type !== "IDAT");

        const compressedBuffer = deflateSync(image.pixels.buffer, { level: 9 });
        const blockSize        = 32767;
        const blockCount       = Math.ceil(compressedBuffer.byteLength / blockSize)|0;

        if (indexOfFirstPixelData < 0)
            indexOfFirstPixelData = newChunks.length;

        for (let block = 0; block < blockCount; block++) {
            const blockOffset = block * blockSize;
            const blockEnd    = Math.min(compressedBuffer.byteLength, blockOffset + blockSize);

            newChunks.splice(indexOfFirstPixelData++, 0, new ChunkPixelData(compressedBuffer.buffer.slice(compressedBuffer.byteOffset + blockOffset, compressedBuffer.byteOffset + blockEnd)));
        }

        this.chunks = newChunks;
    }

    public toRGBA(): [PNGFile, PNGImageRGBA] {
        const rawImage = this.renderImage();
        if (rawImage instanceof PNGImageRGBA)
            return [this, rawImage];

        const oldHeader  = <ChunkHeader>this.chunks[0];
        const newHeader  = new ChunkHeader(oldHeader.width, oldHeader.height, oldHeader.bitDepth === 16? 16: 8, ColorType.RGBA, oldHeader.compression, oldHeader.filter, InterlaceType.None);
        const bytes      = (computeLineByteWidth(newHeader.width, newHeader.bitDepth, 4) + 1) * newHeader.height;
        const pixels     = newHeader.bitDepth === 16? new PNGPixelComponentAccess16(new DataView(new ArrayBuffer(bytes)), newHeader.width * 4): new PNGPixelComponentAccess8(new Uint8Array(new ArrayBuffer(bytes)), newHeader.width * 4);
        const rgbaImage  = new PNGImageRGBA(newHeader, newHeader.width, newHeader.height, pixels);
        const pixel      = { r: 0, g: 0, b: 0, a: 0 };

        for (let y = 0; y < newHeader.height; y++) {
            for (let x = 0; x < newHeader.width; x++) {
                rawImage.copyPixel(x, y, pixel);
                rgbaImage.setPixel(x, y, pixel);
            }
        }

        const newChunks: Chunk[] = [];
        const ignoredChunkTypes = new Set<string>([
            "IHDR",
            "PLTE",
            "hIST",
            "sPLT",
            "tRNS",
            "sBIT",
            "IDAT",
            "IEND",
        ]);

        newChunks.push(newHeader);

        for (const chunk of this.chunks) {
            if (ignoredChunkTypes.has(chunk.type))
                continue;

            newChunks.push(chunk.chunkClone());
        }

        const compressedBuffer = deflateSync(pixels.pixels.buffer, { level: 9 });
        const blockSize        = 32767;
        const blockCount       = Math.ceil(compressedBuffer.byteLength / blockSize)|0;

        for (let block = 0; block < blockCount; block++) {
            const blockOffset = block * blockSize;
            const blockEnd    = Math.min(compressedBuffer.byteLength, blockOffset + blockSize);

            newChunks.push(new ChunkPixelData(compressedBuffer.buffer.slice(compressedBuffer.byteOffset + blockOffset, compressedBuffer.byteOffset + blockEnd)));
        }

        newChunks.push(new ChunkEnd());
        return [new PNGFile(newChunks), rgbaImage];
    }

    clone(): PNGFile {
        return new PNGFile(this.chunks.map((original) => original.chunkClone()));
    }
};
