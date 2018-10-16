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

const crcTable: Uint32Array = (function() {
    const table = new Uint32Array(256);

    for (let i = 0; i < 256; i++) {
        let currentCrc = i;

        for (var j = 0; j < 8; j++) {
            if (currentCrc & 1)
                currentCrc = 0xedb88320 ^ (currentCrc >>> 1);
            else
                currentCrc = currentCrc >>> 1;
        }
        
        table[i] = currentCrc;
    }

    return table;
}());

export function crc32(buffer: Uint8Array) {
    const length = buffer.length;
    let   crc    = -1;

    for (let index = 0; index < length; index++)
        crc = crcTable[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);

    return crc ^ -1;
}
