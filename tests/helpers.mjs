import { createRequire } from 'node:module';
import zlib from 'node:zlib';
import { createZipBuffer } from '../src/index.mjs';

export const cjs = createRequire(import.meta.url)('../cjs/index.cjs');

export function zip(entries, options) {
  return createZipBuffer(entries, { validate: false, ...(options || {}) });
}

export function validZip(entries, options) {
  return createZipBuffer(entries, options);
}

export function deflate(data) {
  return zlib.deflateRawSync(Buffer.from(data), { level: 9 });
}

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) >>> 0 : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

export function crc32(chunk) {
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = (CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)) >>> 0;
  }
  return (value ^ 0xffffffff) >>> 0;
}

export function findEocd(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

export function centralDirectoryOffset(buffer) {
  const eocd = findEocd(buffer);
  return buffer.readUInt32LE(eocd + 16);
}

export function patchUInt16(buffer, offset, value) {
  const copy = Buffer.from(buffer);
  copy.writeUInt16LE(value, offset);
  return copy;
}

export function patchUInt32(buffer, offset, value) {
  const copy = Buffer.from(buffer);
  copy.writeUInt32LE(value >>> 0, offset);
  return copy;
}

export function patchByte(buffer, offset, value) {
  const copy = Buffer.from(buffer);
  copy[offset] = value & 0xff;
  return copy;
}

export function hasFinding(report, code) {
  return report.findings.some((finding) => finding.code === code);
}

export function findingCodes(report) {
  return report.findings.map((finding) => finding.code);
}

export function asciiBytes(value) {
  return Buffer.from(value, 'ascii');
}
