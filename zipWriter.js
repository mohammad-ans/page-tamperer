(function (global){
    "use strict"

    const CRC_TABLE = (() => {
        const table = new Uint32Array(256)
        for (let n = 0; n < 256; n++) {
            let c = n;
            for(let k = 0; k < 8; k++) {
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            }
            table[n] = c >>> 0;
        }
        return table;
    })()
    function crc32(bytes) {
        let crc = 0xffffffff
        for (let i = 0; i < bytes.length; i++) 
            crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
        return (crc ^ 0xffffffff) >>> 0;
    }
    function u16(n) {
        return [n & 0xff, (n >>> 8) & 0xff]
    }
    function u32(n) {
        return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
    }

    function dosDateTime(date) {
        const time = u16(
            ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) |  ((date.getSeconds() >> 1) & 0x1f)
        )
        const day = u16(
            (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonths() + 1) & 0xf) << 5) | (date.getDate() & 0x1f)
        )
        return {time, day}
    }
    function createZip(entries) {
        const encoder = new TextEncoder()
        const {time, day} = dosDateTime(new Date())
        const localParts = []
        const centralParts = []
        let offset = 0;
        for (const entry of entries) {
            const nameBytes = encoder.encode(entry.name)
            const dataBytes = encoder.encode(entry.data)
            const crc = crc32(dataBytes)
            const size = dataBytes.length
            const localHeader = new Uint8Array([
                0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, ...time, ...day, ...u32(crc), ...u32(size), ...u32(size), ...u16(nameBytes.length), 0, 0
            ])
            localParts.push(localHeader, nameBytes, dataBytes)
            const centralHeader = new Uint8Array([
                0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0, 0, 0, ...time, ...day, ...u32(crc) , ...u32(size), ...u32(size), ...u16(nameBytes.length), 0, 0, 0, 0, 0, 0, 0, 0, ...u32(0), ...u32(offset)
            ])
            centralParts.push(centralHeader, nameBytes)
            offset += localHeader.length + nameBytes.length + dataBytes.length
        }
        const centralStart = offset
        const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)

        const endRecord = new Uint8Array([
            0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, ...u16(entries.length), ...u16(entries.length), ...u32(centralSize), ...u32(centralStart), 0, 0
        ])
        return new Blob([...localParts, ...centralParts, endRecord], {type: "application/zip"})
    }
    global.PTZip = {createZip};
})(typeof self !== "undefined" ? self : this)
