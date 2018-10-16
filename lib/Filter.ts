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

const abs   = Math.abs;
const floor = Math.floor;

export function unfilter1(xComparison: number, dest: Uint8Array, offset: number, byteWidth: number): void {
    const xBiggerThan = xComparison - 1;
    
    for (let x = 0; x < byteWidth; x++) {
        const rawByte = dest[offset + x];
        const f1Left  = x > xBiggerThan ? dest[offset + x - xComparison] : 0;

        dest[offset + x] = rawByte + f1Left;
    }  
}

export function unfilter2(dest: Uint8Array, offset: number, previousLineOffset: number | undefined, byteWidth: number) {
    const hasPreviousLine = previousLineOffset !== undefined;

    for (let x = 0; x < byteWidth; x++) {
        const rawByte = dest[offset + x];
        const f2Up    = hasPreviousLine ? dest[previousLineOffset! + x] : 0;

        dest[offset + x] = rawByte + f2Up;
    }
}

export function unfilter3(xComparison: number, dest: Uint8Array, offset: number, previousLineOffset: number | undefined, byteWidth: number) {
    const xBiggerThan     = xComparison - 1;
    const hasPreviousLine = previousLineOffset !== undefined;

    for (let x = 0; x < byteWidth; x++) {
        const rawByte = dest[offset + x];
        const f3Up    = hasPreviousLine ? dest[previousLineOffset! + x] : 0;
        const f3Left  = x > xBiggerThan ? dest[offset + x - xComparison] : 0;
        const f3Add   = floor((f3Left + f3Up) / 2);

        dest[offset + x] = rawByte + f3Add;
    }
}

function paethPredictor(left: number, above: number, upLeft: number) {
    const paeth   = left + above - upLeft;
    const pLeft   = abs(paeth - left);
    const pAbove  = abs(paeth - above);
    const pUpLeft = abs(paeth - upLeft);
  
    if (pLeft <= pAbove && pLeft <= pUpLeft)
        return left;

    if (pAbove <= pUpLeft)
        return above;

    return upLeft;
}

export function unfilter4(xComparison: number, dest: Uint8Array, offset: number, previousLineOffset: number | undefined, byteWidth: number) {
    const xBiggerThan     = xComparison - 1;
    const hasPreviousLine = previousLineOffset !== undefined;
  
    for (let x = 0; x < byteWidth; x++) {
        const rawByte  = dest[offset + x];
        const f4Up     = hasPreviousLine ? dest[previousLineOffset! + x] : 0;
        const f4Left   = x > xBiggerThan ? dest[offset + x - xComparison] : 0;
        const f4UpLeft = x > xBiggerThan && hasPreviousLine ? dest[previousLineOffset! + x - xComparison] : 0;
        const f4Add    = paethPredictor(f4Left, f4Up, f4UpLeft);

        dest[offset + x] = rawByte + f4Add;
    }
}
