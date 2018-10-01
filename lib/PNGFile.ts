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

import { ColorType, Chunk, ChunkHeader, ChunkEnd, ChunkPixelData, ChunkUnknown, PNGUnit } from "./Chunk"

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

import { inflateSync } from "zlib";
import { unfilter1, unfilter2, unfilter3, unfilter4 } from "./Filter";

import { PNGImage,
         computeLineByteWidth,
         computeImageSize }                from "./PNGImage";
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
         PNGPixelComponentAccess16,
         networkOrderToNativeOrderUint16 } from "./PNGPixelComponentAccess";
import { PNGImageInterlaced, getImagePasses, ImagePass } from "./PNGImageInterlaced";

const chunkMap: Readonly<{ [chunkName: string]: typeof Chunk }> = Object.freeze({
    "bKGD": ChunkBackground,
    "cHRM": ChunkChromatic,
    "IEND": ChunkEnd,
    "gAMA": ChunkGamma,
    "IHDR": ChunkHeader,
    "iCCP": ChunkICCProfile,
    "PLTE": ChunkPalette,
    "hIST": ChunkPaletteHistogram,
    "sPLT": ChunkPaletteSuggestion,
    "pHYs": ChunkPhysicalPixels,
    "IDAT": ChunkPixelData,
    "iTXt": ChunkText,
    "tEXt": ChunkText,
    "zTXt": ChunkText,
    "tIME": ChunkTime,
    "tRNS": ChunkTransparency,
    "sBIT": ChunkSignificantBits,
    "sRGB": ChunkSRGB,
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

export type AnyPixelAccess = Uint8Array | Uint16Array | PNGPixelComponentAccess;

export class PNGFile {
    private chunks: Chunk[] = [];

    constructor(chunks: Chunk[]) {
        this.chunks = chunks;
    }

    public static parse(buffer: ArrayBuffer, delegate?: PNGDelegate): PNGFile {
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

            if (delegate && delegate.chunk)
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

    private createPixelAccess(buffer: ArrayBuffer, needComponentAccess: boolean, rawValue: boolean): AnyPixelAccess {
        if (needComponentAccess) {
            switch (this.bitDepth) {
            case 1:
                return new PNGPixelComponentAccess1(buffer);

            case 2:
                if (rawValue)
                    return new PNGPixelComponentAccess2R(buffer);
                return new PNGPixelComponentAccess2(buffer);

            case 4:
                if (rawValue)
                    return new PNGPixelComponentAccess4R(buffer);
                return new PNGPixelComponentAccess4(buffer);

            case 8:
                if (rawValue)
                    return new PNGPixelComponentAccess8R(buffer);
                return new PNGPixelComponentAccess8(buffer);

            case 16:
                return new PNGPixelComponentAccess16(networkOrderToNativeOrderUint16(buffer));
            }
        }
        else {
            switch (this.bitDepth) {
            case 8:
                return new Uint8Array(buffer);
            case 16:
                return new Uint16Array(networkOrderToNativeOrderUint16(buffer));
            }
        }

        throw new Error(`Invalid bit depth: ${this.bitDepth}`);
    }

    private raxPixels(): DataView {
        let coffset = 0;
        let ccount  = 0;
        let clength = 0;

        for (const chunk of this.chunks) {
            if (chunk.type !== "IDAT")
                continue;

            ccount  += 1;
            clength += (<ChunkPixelData>chunk).data.byteLength;
        }

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
        const height         = this.height;
        const width          = this.width;
        const bitDepth       = this.bitDepth;
        const componentCount = this.componentCount;
        const colorType      = this.colorType;

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

        const pixels    = this.raxPixels();
        const pixelSize = this.pixelSize;
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
            let   offsetOut       = 0;
            let   rawLine:           Uint8Array | undefined;
            let   previousOffsetOut: number     | undefined;

            for (let y = 0; y < pass.height; y++, offset += scanLineInBytes, offsetOut += lineInBytes) {
                const filterType = pixels8[offset];

                if (filterType !== 0) {
                    if (!rawLine)
                        rawLine = new Uint8Array(lineInBytes);

                    rawLine.set(pixels8.slice(offset + 1, offset + 1 + lineInBytes))
                }

                switch (filterType) {
                case 0:
                    pixels8.copyWithin(offsetOut, offset + 1, offset + 1 + lineInBytes);
                    break;
                case 1:
                    unfilter1(pixelSize, rawLine!, pixels8, offsetOut);
                    break;
                case 2:
                    unfilter2(rawLine!, pixels8, offsetOut, previousOffsetOut);
                    break;
                case 3:
                    unfilter3(pixelSize, rawLine!, pixels8, offsetOut, previousOffsetOut);
                    break;
                case 4:
                    unfilter4(pixelSize, rawLine!, pixels8, offsetOut, previousOffsetOut);
                    break;
                default:
                    throw new Error(`Unsupported filter type ${filterType}`);
                }

                previousOffsetOut = offsetOut;
            }

            let scanLineInPixels = pass.width;

            switch (bitDepth) {
            case 1:
                if ((scanLineInPixels % 8) !== 0)
                    scanLineInPixels += (8 - (scanLineInPixels % 8));
                break;
            case 2:
                if ((scanLineInPixels % 4) !== 0)
                    scanLineInPixels += (4 - (scanLineInPixels % 4));
                break;
            case 4:
                if ((scanLineInPixels % 2) !== 0)
                    scanLineInPixels += (2 - (scanLineInPixels % 2));
                break;
            }

            const pixelsBuffer = pixels.buffer.slice(pixels.byteOffset + pass.offset, pixels.byteOffset + pass.offset + offsetOut);

            switch (colorType) {
            case ColorType.Palette:
                images.push(new PNGImageIndexed(pass.width, pass.height, scanLineInPixels, <PNGPixelComponentAccess>this.createPixelAccess(pixelsBuffer, true, true), palette!));
                break;
            case ColorType.Grayscale:
                images.push(new PNGImageGray(pass.width, pass.height, scanLineInPixels, <PNGPixelComponentAccess>this.createPixelAccess(pixelsBuffer, true, false), transparencyChunk));
                break;
            case ColorType.GrayscaleAlpha:
                images.push(new PNGImageGrayAlpha(pass.width, pass.height, <Uint8Array | Uint16Array>this.createPixelAccess(pixelsBuffer, false, false)));
                break;
            case ColorType.RGB:
                images.push(new PNGImageRGB(pass.width, pass.height, <Uint8Array | Uint16Array>this.createPixelAccess(pixelsBuffer, false, false), transparencyChunk));
                break;
            case ColorType.RGBA:
                images.push(new PNGImageRGBA(pass.width, pass.height, <Uint8Array | Uint16Array>this.createPixelAccess(pixelsBuffer, false, false)));
                break;
            default:
                throw new Error(`Unsupported color type ${this.colorType}`);
            }
        }

        if (images.length === 1)
            return images[0];

        if (images.length === 7)
            return new PNGImageInterlaced(width, height, images);

        throw new Error(`Unknown interlacing mode: ${images.length}`);
    }

    public renderImageRGBA(): PNGImageRGBA {
        const rawImage = this.renderImage();
        if (rawImage instanceof PNGImageRGBA)
            return rawImage;

        const width      = this.width;
        const height     = this.height;
        const pixelCount = (width * height * 4);
        const pixels     = this.bitDepth <= 8? new Uint8Array(pixelCount): new Uint16Array(pixelCount);
        const rgbaImage  = new PNGImageRGBA(width, height, pixels);
        const pixel      = { r: 0, g: 0, b: 0, a: 0 };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                rawImage.copyPixel(x, y, pixel);
                rgbaImage.setPixel(x, y, pixel);
            }
        }

        return rgbaImage;
    }
};
