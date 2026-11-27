/*
 * zipcage core.
 *
 * Pure Node.js built-ins with no runtime dependencies. The CommonJS build in
 * cjs/index.cjs is generated from this file by scripts/build-cjs.mjs so both
 * module formats have identical behavior.
 */
import { createInflateRaw, deflateRawSync } from 'node:zlib';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';

export const CODE = Object.freeze({
  INVALID_INPUT: 'ERR_ZIPCAGE_INVALID_INPUT',
  INVALID_OPTIONS: 'ERR_ZIPCAGE_INVALID_OPTIONS',
  MALFORMED_ZIP: 'ERR_ZIPCAGE_MALFORMED_ZIP',
  TRUNCATED: 'ERR_ZIPCAGE_TRUNCATED',
  UNSUPPORTED_ZIP64: 'ERR_ZIPCAGE_UNSUPPORTED_ZIP64',
  MULTI_DISK: 'ERR_ZIPCAGE_MULTI_DISK',
  POLYGLOT: 'ERR_ZIPCAGE_POLYGLOT',
  ENTRY_LIMIT: 'ERR_ZIPCAGE_ENTRY_LIMIT',
  SIZE_LIMIT: 'ERR_ZIPCAGE_SIZE_LIMIT',
  RATIO_LIMIT: 'ERR_ZIPCAGE_RATIO_LIMIT',
  OVERLAPPING_DATA: 'ERR_ZIPCAGE_OVERLAPPING_DATA',
  INVALID_ENCODING: 'ERR_ZIPCAGE_INVALID_ENCODING',
  EMPTY_PATH: 'ERR_ZIPCAGE_EMPTY_PATH',
  PATH_TOO_DEEP: 'ERR_ZIPCAGE_PATH_TOO_DEEP',
  PATH_TOO_LONG: 'ERR_ZIPCAGE_PATH_TOO_LONG',
  CONTROL_CHARACTER: 'ERR_ZIPCAGE_CONTROL_CHARACTER',
  PATH_TRAVERSAL: 'ERR_ZIPCAGE_PATH_TRAVERSAL',
  ABSOLUTE_PATH: 'ERR_ZIPCAGE_ABSOLUTE_PATH',
  DRIVE_PATH: 'ERR_ZIPCAGE_DRIVE_PATH',
  UNC_PATH: 'ERR_ZIPCAGE_UNC_PATH',
  EMPTY_PATH_SEGMENT: 'ERR_ZIPCAGE_EMPTY_PATH_SEGMENT',
  RESERVED_NAME: 'ERR_ZIPCAGE_RESERVED_NAME',
  TRAILING_DOT_OR_SPACE: 'ERR_ZIPCAGE_TRAILING_DOT_OR_SPACE',
  PROTOTYPE_POLLUTION: 'ERR_ZIPCAGE_PROTOTYPE_POLLUTION',
  DUPLICATE_PATH: 'ERR_ZIPCAGE_DUPLICATE_PATH',
  FILE_DIRECTORY_COLLISION: 'ERR_ZIPCAGE_FILE_DIRECTORY_COLLISION',
  SYMLINK: 'ERR_ZIPCAGE_SYMLINK',
  SPECIAL_FILE: 'ERR_ZIPCAGE_SPECIAL_FILE',
  SUID_SGID: 'ERR_ZIPCAGE_SUID_SGID',
  ENCRYPTED: 'ERR_ZIPCAGE_ENCRYPTED',
  UNSUPPORTED_METHOD: 'ERR_ZIPCAGE_UNSUPPORTED_METHOD',
  UNSUPPORTED_FLAGS: 'ERR_ZIPCAGE_UNSUPPORTED_FLAGS',
  HEADER_MISMATCH: 'ERR_ZIPCAGE_HEADER_MISMATCH',
  CRC_MISMATCH: 'ERR_ZIPCAGE_CRC_MISMATCH',
  SIZE_MISMATCH: 'ERR_ZIPCAGE_SIZE_MISMATCH',
  DEFLATE_ERROR: 'ERR_ZIPCAGE_DEFLATE_ERROR',
  TRAILING_COMPRESSED_DATA: 'ERR_ZIPCAGE_TRAILING_COMPRESSED_DATA',
  ENTRY_NOT_FOUND: 'ERR_ZIPCAGE_ENTRY_NOT_FOUND',
  EXTRACTION_REFUSED: 'ERR_ZIPCAGE_EXTRACTION_REFUSED',
  EXTRACTION_SYMLINK: 'ERR_ZIPCAGE_EXTRACTION_SYMLINK',
  EXTRACTION_COLLISION: 'ERR_ZIPCAGE_EXTRACTION_COLLISION',
  EXTRACTION_OVERWRITE: 'ERR_ZIPCAGE_EXTRACTION_OVERWRITE',
  EXTRACTION_FAILED: 'ERR_ZIPCAGE_EXTRACTION_FAILED'
});

export class ZipCageError extends Error {
  constructor(code, reason, input, cause) {
    super(code + ': ' + reason);
    this.name = 'ZipCageError';
    this.code = code;
    this.reason = reason;
    this.input = input;
    if (cause !== undefined) this.cause = cause;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      reason: this.reason,
      input: this.input
    };
  }
}

function throwError(code, reason, input, cause) {
  throw new ZipCageError(code, reason, input, cause);
}

function configError(reason, input) {
  throwError(CODE.INVALID_OPTIONS, reason, input);
}

const DEFAULT_MAX_ENTRIES = 1000;
const DEFAULT_MAX_ENTRY_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
const DEFAULT_MAX_COMPRESSION_RATIO = 100;
const DEFAULT_MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const DEFAULT_MAX_DEPTH = 20;
const DEFAULT_MAX_PATH_LENGTH = 512;
const UINT16_MAX = 0xffff;
const UINT32_MAX = 0xffffffff;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const DATA_DESCRIPTOR_SIGNATURE = 0x08074b50;
const EOCD_MIN_LENGTH = 22;
const CENTRAL_FIXED_LENGTH = 46;
const LOCAL_FIXED_LENGTH = 30;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
const FLAG_ENCRYPTED = 0x0001;
const FLAG_DATA_DESCRIPTOR = 0x0008;
const FLAG_UTF8 = 0x0800;
const UNSUPPORTED_FLAG_MASK = 0x0010 | 0x0020 | 0x0040 | 0x0080 | 0x0100 | 0x0200 | 0x0400 | 0x1000 | 0x2000 | 0x4000 | 0x8000;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/u;
const RESERVED_DEVICE_RE = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/;
const DRIVE_RE = /^[A-Za-z]:/;
const PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const KNOWN_OPTION_KEYS = new Set([
  'maxEntries',
  'maxEntryUncompressedBytes',
  'maxTotalUncompressedBytes',
  'maxCompressionRatio',
  'maxArchiveBytes',
  'maxDepth',
  'maxPathLength',
  'allowSymlinks',
  'allowSpecialFiles',
  'allowSuidSgid',
  'allowEncrypted',
  'allowPrototypePollutingNames',
  'caseInsensitiveDuplicates',
  'rejectPolyglot',
  'overwrite'
]);
const textDecoder = new TextDecoder('utf-8', { fatal: true });

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) >>> 0 : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

function crc32Update(crc, chunk) {
  let value = (crc ^ 0xffffffff) >>> 0;
  for (let index = 0; index < chunk.length; index += 1) {
    value = (CRC_TABLE[(value ^ chunk[index]) & 0xff] ^ (value >>> 8)) >>> 0;
  }
  return (value ^ 0xffffffff) >>> 0;
}

function crc32(chunk) {
  return crc32Update(0, chunk);
}

const CP437_HIGH =
  '\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5' +
  '\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00a2\u00a3\u00a5\u20a7\u0192' +
  '\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba\u00bf\u2310\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb' +
  '\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255d\u255c\u255b\u2510' +
  '\u2514\u2534\u252c\u251c\u2500\u253c\u255e\u255f\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u2567' +
  '\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256b\u256a\u2518\u250c\u2588\u2584\u258c\u2590\u2580' +
  '\u03b1\u00df\u0393\u03c0\u03a3\u03c3\u00b5\u03c4\u03a6\u0398\u03a9\u03b4\u221e\u03c6\u03b5\u2229' +
  '\u2261\u00b1\u2265\u2264\u2320\u2321\u00f7\u2248\u00b0\u2219\u00b7\u221a\u207f\u00b2\u25a0\u00a0';

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
}

function defaultConfig() {
  const config = Object.create(null);
  config.maxEntries = DEFAULT_MAX_ENTRIES;
  config.maxEntryUncompressedBytes = DEFAULT_MAX_ENTRY_UNCOMPRESSED_BYTES;
  config.maxTotalUncompressedBytes = DEFAULT_MAX_TOTAL_UNCOMPRESSED_BYTES;
  config.maxCompressionRatio = DEFAULT_MAX_COMPRESSION_RATIO;
  config.maxArchiveBytes = DEFAULT_MAX_ARCHIVE_BYTES;
  config.maxDepth = DEFAULT_MAX_DEPTH;
  config.maxPathLength = DEFAULT_MAX_PATH_LENGTH;
  config.allowSymlinks = false;
  config.allowSpecialFiles = false;
  config.allowSuidSgid = false;
  config.allowEncrypted = false;
  config.allowPrototypePollutingNames = false;
  config.caseInsensitiveDuplicates = true;
  config.rejectPolyglot = true;
  config.overwrite = false;
  return config;
}

function copyConfig(base) {
  const config = Object.create(null);
  for (const key of Object.keys(base)) config[key] = base[key];
  return config;
}

function assertBoolean(value, key) {
  if (typeof value !== 'boolean') configError(key + ' must be a boolean', value);
  return value;
}

function assertPositiveInteger(value, key) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    configError(key + ' must be a positive safe integer', value);
  }
  return value;
}

function assertRatio(value, key) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 1) {
    configError(key + ' must be a number greater than or equal to 1', value);
  }
  return value;
}

function applyOptions(config, options) {
  if (options === undefined || options === null) return config;
  if (!isPlainObject(options)) configError('options must be a plain object', options);
  for (const key of Object.keys(options)) {
    if (!KNOWN_OPTION_KEYS.has(key)) {
      configError('unknown or reserved option key: ' + key, key);
    }
  }
  for (const key of Object.keys(options)) {
    const value = own(options, key);
    switch (key) {
      case 'maxEntries':
      case 'maxEntryUncompressedBytes':
      case 'maxTotalUncompressedBytes':
      case 'maxArchiveBytes':
      case 'maxDepth':
      case 'maxPathLength':
        config[key] = assertPositiveInteger(value, key);
        break;
      case 'maxCompressionRatio':
        config[key] = assertRatio(value, key);
        break;
      default:
        config[key] = assertBoolean(value, key);
        break;
    }
  }
  return config;
}

function resolveOptions(base, overrides) {
  const config = base === null || base === undefined ? defaultConfig() : copyConfig(base);
  return Object.freeze(applyOptions(config, overrides));
}

function asBuffer(value, label) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  throwError(CODE.INVALID_INPUT, label + ' must be a Buffer, ArrayBuffer or Uint8Array', value);
}

function bytesFrom(value, label) {
  if (value === undefined || value === null) return Buffer.alloc(0);
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  return asBuffer(value, label);
}

function readUInt16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function makeFinding(code, message, entryIndex, entryName) {
  const finding = Object.create(null);
  finding.code = code;
  finding.severity = 'error';
  finding.message = message;
  if (entryIndex !== null && entryIndex !== undefined) finding.entryIndex = entryIndex;
  if (entryName !== null && entryName !== undefined) finding.entryName = entryName;
  return Object.freeze(finding);
}

function decodeCp437(bytes) {
  let output = '';
  for (const byte of bytes) {
    output += byte < 0x80 ? String.fromCharCode(byte) : CP437_HIGH[byte - 0x80];
  }
  return output;
}

function decodeEntryName(bytes, utf8) {
  if (!utf8) return { name: decodeCp437(bytes), invalidEncoding: false };
  try {
    return { name: textDecoder.decode(bytes), invalidEncoding: false };
  } catch {
    let fallback = '';
    try {
      fallback = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      fallback = '';
    }
    return { name: fallback, invalidEncoding: true };
  }
}

function extraFieldState(extra) {
  let offset = 0;
  let malformed = false;
  let zip64 = false;
  while (offset + 4 <= extra.length) {
    const id = readUInt16(extra, offset);
    const size = readUInt16(extra, offset + 2);
    if (id === 0x0001) zip64 = true;
    if (offset + 4 + size > extra.length) {
      malformed = true;
      break;
    }
    offset += 4 + size;
  }
  if (offset !== extra.length) malformed = true;
  return { malformed, zip64 };
}

function locateEocd(buffer, rejectPolyglot) {
  const minimum = Math.max(0, buffer.length - (EOCD_MIN_LENGTH + UINT16_MAX));
  let firstPlausible = null;
  for (let offset = buffer.length - EOCD_MIN_LENGTH; offset >= minimum; offset -= 1) {
    if (readUInt32(buffer, offset) !== EOCD_SIGNATURE) continue;
    const commentLength = readUInt16(buffer, offset + 20);
    const end = offset + EOCD_MIN_LENGTH + commentLength;
    if (end > buffer.length) continue;
    const candidate = { offset, end, commentLength };
    if (end === buffer.length) return candidate;
    if (firstPlausible === null) firstPlausible = candidate;
  }
  return firstPlausible;
}

function canonicalPathKey(name) {
  return name.normalize('NFC').toLowerCase();
}

function pathStemAndDirectory(name) {
  const directory = name.endsWith('/');
  const stem = directory ? name.slice(0, -1) : name;
  return { stem, directory };
}

function validateEntryPath(entry, config, addFinding) {
  const name = entry.name;
  const index = entry.index;
  if (typeof name !== 'string' || name.length === 0) {
    addFinding(CODE.EMPTY_PATH, 'entry path is empty', index, name);
    entry.normalizedName = '';
    entry.pathSegments = Object.freeze([]);
    return;
  }

  if (name.startsWith('//') || name.startsWith('\\\\')) {
    addFinding(CODE.UNC_PATH, 'UNC paths are not safe extraction targets', index, name);
  } else if (name.startsWith('/') || name.startsWith('\\')) {
    addFinding(CODE.ABSOLUTE_PATH, 'absolute paths are not safe extraction targets', index, name);
  }
  if (CONTROL_RE.test(name)) {
    addFinding(CODE.CONTROL_CHARACTER, 'entry path contains a NUL, C0 or C1 control character', index, name);
  }
  if (DRIVE_RE.test(name)) {
    addFinding(CODE.DRIVE_PATH, 'Windows drive-letter paths are rejected', index, name);
  }
  if (name.includes(':') && !DRIVE_RE.test(name)) {
    addFinding(CODE.DRIVE_PATH, 'colons are rejected to prevent drive and alternate-stream confusion', index, name);
  }
  if (name.includes('\\')) {
    addFinding(CODE.PATH_TRAVERSAL, 'backslashes are rejected as cross-platform path separators', index, name);
  }

  const parsed = pathStemAndDirectory(name);
  const stem = parsed.stem;
  if (stem.length === 0) {
    addFinding(CODE.EMPTY_PATH, 'entry path has no file or directory name', index, name);
  }
  const segments = stem.length === 0 ? [] : stem.split('/');
  for (const segment of segments) {
    if (segment.length === 0) {
      addFinding(CODE.EMPTY_PATH_SEGMENT, 'entry path contains an empty path segment', index, name);
      continue;
    }
    if (segment === '.' || segment === '..') {
      addFinding(CODE.PATH_TRAVERSAL, 'dot segments are rejected instead of normalized', index, name);
    }
    if (/[. ]$/.test(segment)) {
      addFinding(CODE.TRAILING_DOT_OR_SPACE, 'Windows strips trailing dots and spaces from path segments', index, name);
    }
    const deviceStem = segment.split('.')[0].replace(/[. ]+$/u, '').toUpperCase();
    if (RESERVED_DEVICE_RE.test(deviceStem)) {
      addFinding(CODE.RESERVED_NAME, 'Windows reserved device names are rejected', index, name);
    }
    if (!config.allowPrototypePollutingNames && PROTOTYPE_KEYS.has(segment.toLowerCase())) {
      addFinding(CODE.PROTOTYPE_POLLUTION, 'prototype-polluting path segment names are rejected', index, name);
    }
  }
  if (segments.length > config.maxDepth) {
    addFinding(CODE.PATH_TOO_DEEP, 'entry path exceeds maxDepth', index, name);
  }
  if (Buffer.byteLength(name, 'utf8') > config.maxPathLength) {
    addFinding(CODE.PATH_TOO_LONG, 'entry path exceeds maxPathLength', index, name);
  }

  entry.normalizedName = segments.join('/');
  entry.pathSegments = Object.freeze(segments.slice());
}

function unixTypeName(type) {
  switch (type) {
    case 0o100000: return 'file';
    case 0o040000: return 'directory';
    case 0o120000: return 'symlink';
    case 0o010000: return 'fifo';
    case 0o140000: return 'socket';
    case 0o060000: return 'block-device';
    case 0o020000: return 'character-device';
    case 0: return 'unspecified';
    default: return 'unknown';
  }
}

function validateUnixAttributes(entry, config, addFinding) {
  const unixMode = entry.unixMode;
  const type = unixMode & 0o170000;
  const permissions = unixMode & 0o7777;
  entry.unixFileType = unixTypeName(type);
  if (type === 0o120000 && !config.allowSymlinks) {
    addFinding(CODE.SYMLINK, 'symlink entries are rejected by default', entry.index, entry.name);
  }
  if (
    (type === 0o010000 || type === 0o140000 || type === 0o060000 || type === 0o020000 ||
      (type !== 0 && type !== 0o100000 && type !== 0o040000 && type !== 0o120000)) &&
    !config.allowSpecialFiles
  ) {
    addFinding(CODE.SPECIAL_FILE, 'FIFO, socket, device and unknown special entries are rejected', entry.index, entry.name);
  }
  if ((permissions & 0o6000) !== 0 && !config.allowSuidSgid) {
    addFinding(CODE.SUID_SGID, 'setuid and setgid permission bits are rejected', entry.index, entry.name);
  }
}

function parseCentralEntry(buffer, offset, index, addFinding) {
  if (offset + CENTRAL_FIXED_LENGTH > buffer.length) {
    addFinding(CODE.TRUNCATED, 'central directory header is truncated', index, null);
    return null;
  }
  if (readUInt32(buffer, offset) !== CENTRAL_SIGNATURE) {
    addFinding(CODE.MALFORMED_ZIP, 'central directory signature is missing', index, null);
    return null;
  }
  const versionMadeBy = readUInt16(buffer, offset + 4);
  const versionNeeded = readUInt16(buffer, offset + 6);
  const flags = readUInt16(buffer, offset + 8);
  const compressionMethod = readUInt16(buffer, offset + 10);
  const dosTime = readUInt16(buffer, offset + 12);
  const dosDate = readUInt16(buffer, offset + 14);
  const crc32Value = readUInt32(buffer, offset + 16);
  const compressedSize = readUInt32(buffer, offset + 20);
  const uncompressedSize = readUInt32(buffer, offset + 24);
  const fileNameLength = readUInt16(buffer, offset + 28);
  const extraLength = readUInt16(buffer, offset + 30);
  const commentLength = readUInt16(buffer, offset + 32);
  const diskNumberStart = readUInt16(buffer, offset + 34);
  const internalAttributes = readUInt16(buffer, offset + 36);
  const externalAttributes = readUInt32(buffer, offset + 38);
  const localHeaderOffset = readUInt32(buffer, offset + 42);
  const end = offset + CENTRAL_FIXED_LENGTH + fileNameLength + extraLength + commentLength;
  if (end > buffer.length) {
    addFinding(CODE.TRUNCATED, 'central directory variable-length fields are truncated', index, null);
    return null;
  }
  const nameBytes = Buffer.from(buffer.subarray(offset + CENTRAL_FIXED_LENGTH, offset + CENTRAL_FIXED_LENGTH + fileNameLength));
  const extra = Buffer.from(buffer.subarray(offset + CENTRAL_FIXED_LENGTH + fileNameLength, offset + CENTRAL_FIXED_LENGTH + fileNameLength + extraLength));
  const decoded = decodeEntryName(nameBytes, (flags & FLAG_UTF8) !== 0);
  const unixMode = externalAttributes >>> 16;
  const parsedStem = pathStemAndDirectory(decoded.name);
  const lowerDosDirectory = (externalAttributes & 0x10) !== 0;
  const unixDirectory = (unixMode & 0o170000) === 0o040000;
  const entry = Object.create(null);
  entry.index = index;
  entry.name = decoded.name;
  entry.normalizedName = decoded.name;
  entry.pathSegments = Object.freeze([]);
  entry.directory = parsedStem.directory || lowerDosDirectory || unixDirectory;
  entry.versionMadeBy = versionMadeBy;
  entry.versionNeeded = versionNeeded;
  entry.flags = flags;
  entry.encrypted = (flags & FLAG_ENCRYPTED) !== 0;
  entry.utf8 = (flags & FLAG_UTF8) !== 0;
  entry.dataDescriptor = (flags & FLAG_DATA_DESCRIPTOR) !== 0;
  entry.compressionMethod = compressionMethod;
  entry.compressionMethodName = compressionMethod === METHOD_STORED ? 'stored' : compressionMethod === METHOD_DEFLATE ? 'deflate' : 'unsupported';
  entry.dosTime = dosTime;
  entry.dosDate = dosDate;
  entry.crc32 = crc32Value;
  entry.compressedSize = compressedSize;
  entry.uncompressedSize = uncompressedSize;
  entry.compressionRatio = compressedSize === 0 ? (uncompressedSize === 0 ? 1 : Infinity) : uncompressedSize / compressedSize;
  entry.fileNameLength = fileNameLength;
  entry.extraLength = extraLength;
  entry.commentLength = commentLength;
  entry.diskNumberStart = diskNumberStart;
  entry.internalAttributes = internalAttributes;
  entry.externalAttributes = externalAttributes;
  entry.unixMode = unixMode;
  entry.unixFileType = unixTypeName(unixMode & 0o170000);
  entry.localHeaderOffset = localHeaderOffset;
  entry.dataOffset = null;
  entry.dataEnd = null;
  entry.nameBytes = nameBytes;
  entry.centralExtra = extra;
  entry.invalidEncoding = decoded.invalidEncoding;
  return { entry, end };
}

function compareUnsigned(field, centralValue, localValue, entry, addFinding) {
  if (centralValue !== localValue) {
    addFinding(
      CODE.HEADER_MISMATCH,
      'local file header ' + field + ' does not match the central directory',
      entry.index,
      entry.name
    );
  }
}

function verifyLocalRecord(buffer, entry, centralDirectoryOffset, addFinding) {
  const offset = entry.localHeaderOffset;
  if (offset + LOCAL_FIXED_LENGTH > buffer.length || offset + LOCAL_FIXED_LENGTH > centralDirectoryOffset) {
    addFinding(CODE.TRUNCATED, 'local file header is truncated or outside the file-data region', entry.index, entry.name);
    entry.dataOffset = offset;
    entry.dataEnd = offset;
    return;
  }
  if (readUInt32(buffer, offset) !== LOCAL_SIGNATURE) {
    addFinding(CODE.HEADER_MISMATCH, 'central directory points at bytes without a local file header signature', entry.index, entry.name);
    entry.dataOffset = offset;
    entry.dataEnd = offset;
    return;
  }

  const localVersionNeeded = readUInt16(buffer, offset + 4);
  const localFlags = readUInt16(buffer, offset + 6);
  const localMethod = readUInt16(buffer, offset + 8);
  const localCrc = readUInt32(buffer, offset + 14);
  const localCompressedSize = readUInt32(buffer, offset + 18);
  const localUncompressedSize = readUInt32(buffer, offset + 22);
  const localNameLength = readUInt16(buffer, offset + 26);
  const localExtraLength = readUInt16(buffer, offset + 28);
  const variableEnd = offset + LOCAL_FIXED_LENGTH + localNameLength + localExtraLength;
  if (variableEnd > buffer.length || variableEnd > centralDirectoryOffset) {
    addFinding(CODE.TRUNCATED, 'local file header variable-length fields are truncated', entry.index, entry.name);
    entry.dataOffset = offset;
    entry.dataEnd = offset;
    return;
  }
  const localName = buffer.subarray(offset + LOCAL_FIXED_LENGTH, offset + LOCAL_FIXED_LENGTH + localNameLength);
  if (!localName.equals(entry.nameBytes)) {
    addFinding(CODE.HEADER_MISMATCH, 'local file header filename does not match the central directory filename', entry.index, entry.name);
  }
  if (localMethod !== entry.compressionMethod) {
    addFinding(CODE.HEADER_MISMATCH, 'local file header compression method does not match the central directory', entry.index, entry.name);
  }
  if (localFlags !== entry.flags) {
    addFinding(CODE.HEADER_MISMATCH, 'local file header flags do not match the central directory', entry.index, entry.name);
  }
  compareUnsigned('version-needed', entry.versionNeeded, localVersionNeeded, entry, addFinding);
  if ((entry.flags & FLAG_DATA_DESCRIPTOR) === 0) {
    compareUnsigned('CRC-32', entry.crc32, localCrc, entry, addFinding);
    compareUnsigned('compressed size', entry.compressedSize, localCompressedSize, entry, addFinding);
    compareUnsigned('uncompressed size', entry.uncompressedSize, localUncompressedSize, entry, addFinding);
  } else {
    if (localCrc !== 0 && localCrc !== entry.crc32) {
      addFinding(CODE.HEADER_MISMATCH, 'nonzero local CRC-32 conflicts with the central directory when a data descriptor is in use', entry.index, entry.name);
    }
    if (localCompressedSize !== 0 && localCompressedSize !== entry.compressedSize) {
      addFinding(CODE.HEADER_MISMATCH, 'nonzero local compressed size conflicts with the central directory when a data descriptor is in use', entry.index, entry.name);
    }
    if (localUncompressedSize !== 0 && localUncompressedSize !== entry.uncompressedSize) {
      addFinding(CODE.HEADER_MISMATCH, 'nonzero local uncompressed size conflicts with the central directory when a data descriptor is in use', entry.index, entry.name);
    }
  }

  const localExtra = buffer.subarray(offset + LOCAL_FIXED_LENGTH + localNameLength, variableEnd);
  const extraState = extraFieldState(localExtra);
  if (extraState.malformed) {
    addFinding(CODE.MALFORMED_ZIP, 'local file header extra field is malformed', entry.index, entry.name);
  }
  if (extraState.zip64) {
    addFinding(CODE.UNSUPPORTED_ZIP64, 'ZIP64 local extra fields are outside the supported scope', entry.index, entry.name);
  }

  entry.localVersionNeeded = localVersionNeeded;
  entry.localFlags = localFlags;
  entry.localCompressionMethod = localMethod;
  entry.localCrc32 = localCrc;
  entry.localCompressedSize = localCompressedSize;
  entry.localUncompressedSize = localUncompressedSize;
  entry.localExtraLength = localExtraLength;
  entry.dataOffset = variableEnd;
  entry.dataEnd = variableEnd + entry.compressedSize;
  if (entry.dataEnd > buffer.length || entry.dataEnd > centralDirectoryOffset) {
    addFinding(CODE.TRUNCATED, 'compressed entry data is truncated or reaches into the central directory', entry.index, entry.name);
    return;
  }
  if ((entry.flags & FLAG_DATA_DESCRIPTOR) !== 0) {
    verifyDataDescriptor(buffer, entry, centralDirectoryOffset, addFinding);
  }
}

function verifyDataDescriptor(buffer, entry, centralDirectoryOffset, addFinding) {
  const start = entry.dataEnd;
  if (start + 12 > centralDirectoryOffset) {
    addFinding(CODE.TRUNCATED, 'data descriptor is missing or truncated', entry.index, entry.name);
    return;
  }
  let crc = readUInt32(buffer, start);
  let compressedSize = readUInt32(buffer, start + 4);
  let uncompressedSize = readUInt32(buffer, start + 8);
  if (crc === DATA_DESCRIPTOR_SIGNATURE) {
    if (start + 16 > centralDirectoryOffset) {
      addFinding(CODE.TRUNCATED, 'signed data descriptor is truncated', entry.index, entry.name);
      return;
    }
    crc = readUInt32(buffer, start + 4);
    compressedSize = readUInt32(buffer, start + 8);
    uncompressedSize = readUInt32(buffer, start + 12);
  }
  if (crc !== entry.crc32 || compressedSize !== entry.compressedSize || uncompressedSize !== entry.uncompressedSize) {
    addFinding(CODE.HEADER_MISMATCH, 'data descriptor does not match the central directory', entry.index, entry.name);
  }
}

function finalizeTotals(entries, archiveBytes) {
  let files = 0;
  let directories = 0;
  let compressedBytes = 0;
  let uncompressedBytes = 0;
  let maximumRatio = 0;
  for (const entry of entries) {
    if (entry.directory) directories += 1;
    else files += 1;
    compressedBytes += entry.compressedSize;
    uncompressedBytes += entry.uncompressedSize;
    if (entry.compressionRatio > maximumRatio) maximumRatio = entry.compressionRatio;
  }
  return Object.freeze({
    entries: entries.length,
    files,
    directories,
    compressedBytes,
    uncompressedBytes,
    archiveBytes,
    compressionRatio: compressedBytes === 0 ? (uncompressedBytes === 0 ? 1 : Infinity) : uncompressedBytes / compressedBytes,
    maximumEntryCompressionRatio: entries.length === 0 ? 1 : maximumRatio
  });
}

function finishReport(entries, findings, archiveBytes) {
  const outputEntries = entries.map((entry) => {
    const copy = Object.create(null);
    for (const key of [
      'index', 'name', 'normalizedName', 'pathSegments', 'directory', 'versionMadeBy', 'versionNeeded',
      'flags', 'encrypted', 'utf8', 'dataDescriptor', 'compressionMethod', 'compressionMethodName',
      'dosTime', 'dosDate', 'crc32', 'compressedSize', 'uncompressedSize', 'compressionRatio',
      'fileNameLength', 'extraLength', 'commentLength', 'diskNumberStart', 'internalAttributes',
      'externalAttributes', 'unixMode', 'unixFileType', 'localHeaderOffset', 'dataOffset', 'dataEnd',
      'localVersionNeeded', 'localFlags', 'localCompressionMethod', 'localCrc32', 'localCompressedSize',
      'localUncompressedSize', 'localExtraLength', 'invalidEncoding'
    ]) {
      if (entry[key] !== undefined) copy[key] = entry[key];
    }
    return Object.freeze(copy);
  });
  return Object.freeze({
    safe: findings.length === 0,
    entries: Object.freeze(outputEntries),
    findings: Object.freeze(findings.slice()),
    totals: finalizeTotals(outputEntries, archiveBytes)
  });
}

function addDuplicateAndCollisionFindings(entries, config, addFinding) {
  const exact = new Map();
  const folded = new Map();
  const types = new Map();
  for (const entry of entries) {
    if (!entry.normalizedName) continue;
    const key = entry.normalizedName;
    const foldedKey = canonicalPathKey(key);
    if (exact.has(key)) {
      addFinding(CODE.DUPLICATE_PATH, 'duplicate normalized entry path', entry.index, entry.name);
    } else {
      exact.set(key, entry.index);
    }
    if (config.caseInsensitiveDuplicates) {
      if (folded.has(foldedKey) && exact.get(key) === undefined) {
        addFinding(CODE.DUPLICATE_PATH, 'case-insensitive duplicate normalized entry path', entry.index, entry.name);
      } else if (folded.has(foldedKey) && folded.get(foldedKey) !== key) {
        addFinding(CODE.DUPLICATE_PATH, 'case-insensitive duplicate normalized entry path', entry.index, entry.name);
      } else if (!folded.has(foldedKey)) {
        folded.set(foldedKey, key);
      }
    }
    if (!types.has(foldedKey)) types.set(foldedKey, new Set());
    types.get(foldedKey).add(entry.directory ? 'directory' : 'file');
  }

  const emittedPairs = new Set();
  function collisionFinding(entry, otherKey, kind) {
    const pair = entry.index + ':' + otherKey + ':' + kind;
    if (emittedPairs.has(pair)) return;
    emittedPairs.add(pair);
    addFinding(CODE.FILE_DIRECTORY_COLLISION, 'entry path collides with a file or directory required by another entry', entry.index, entry.name);
  }

  for (const entry of entries) {
    if (!entry.normalizedName) continue;
    const key = canonicalPathKey(entry.normalizedName);
    const typeSet = types.get(key);
    if (typeSet && typeSet.has('file') && typeSet.has('directory')) {
      collisionFinding(entry, key, 'same-path');
    }
    const segments = entry.normalizedName.split('/');
    for (let length = 1; length < segments.length; length += 1) {
      const ancestor = canonicalPathKey(segments.slice(0, length).join('/'));
      const ancestorTypes = types.get(ancestor);
      if (ancestorTypes && ancestorTypes.has('file')) {
        collisionFinding(entry, ancestor, 'ancestor-file');
      }
    }
  }
}

function descriptorLengthForEntry(buffer, entry, centralDirectoryOffset) {
  if ((entry.flags & FLAG_DATA_DESCRIPTOR) === 0) return 0;
  if (!Number.isSafeInteger(entry.dataEnd) || entry.dataEnd + 12 > centralDirectoryOffset) return 0;
  return readUInt32(buffer, entry.dataEnd) === DATA_DESCRIPTOR_SIGNATURE ? 16 : 12;
}

function addLocalLayoutFindings(buffer, entries, centralDirectoryOffset, config, addFinding) {
  const records = new Map();
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.dataOffset) || !Number.isSafeInteger(entry.dataEnd)) continue;
    if (entry.dataEnd > centralDirectoryOffset || entry.dataEnd < entry.dataOffset) continue;
    if (!records.has(entry.localHeaderOffset)) records.set(entry.localHeaderOffset, []);
    records.get(entry.localHeaderOffset).push(entry);
  }
  const ordered = [...records.values()].map((group) => {
    let recordEnd = 0;
    for (const entry of group) {
      const end = entry.dataEnd + descriptorLengthForEntry(buffer, entry, centralDirectoryOffset);
      recordEnd = Math.max(recordEnd, end);
    }
    return { offset: group[0].localHeaderOffset, end: recordEnd, entries: group };
  }).sort((left, right) => left.offset - right.offset);

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous.end > current.offset) {
      addFinding(
        CODE.MALFORMED_ZIP,
        'compressed data or a data descriptor overlaps the next local file header',
        current.entries[0].index,
        current.entries[0].name
      );
    } else if (config.rejectPolyglot && previous.end < current.offset) {
      addFinding(
        CODE.POLYGLOT,
        'unaccounted bytes appear between local file records',
        current.entries[0].index,
        current.entries[0].name
      );
    }
  }
  if (ordered.length > 0) {
    const last = ordered[ordered.length - 1];
    if (last.end > centralDirectoryOffset) {
      addFinding(CODE.TRUNCATED, 'final local file record reaches into the central directory', last.entries[0].index, last.entries[0].name);
    } else if (config.rejectPolyglot && last.end < centralDirectoryOffset) {
      addFinding(CODE.POLYGLOT, 'unaccounted bytes appear before the central directory', last.entries[0].index, last.entries[0].name);
    }
  }
}

function addOverlapFindings(entries, addFinding) {
  const ranges = entries
    .filter((entry) => Number.isSafeInteger(entry.dataOffset) && Number.isSafeInteger(entry.dataEnd))
    .slice()
    .sort((left, right) => left.dataOffset - right.dataOffset || left.dataEnd - right.dataEnd || left.index - right.index);
  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const current = ranges[index];
    const positiveOverlap = current.dataOffset < previous.dataEnd && previous.dataOffset < current.dataEnd;
    const emptyAlias = previous.compressedSize === 0 && current.compressedSize === 0 && previous.dataOffset === current.dataOffset;
    if (positiveOverlap || emptyAlias) {
      addFinding(
        CODE.OVERLAPPING_DATA,
        'compressed data ranges overlap, a non-recursive zip-bomb and parser-differential primitive',
        current.index,
        current.name
      );
    }
  }
}

export function inspectZipBuffer(input, options) {
  const config = resolveOptions(null, options);
  const buffer = asBuffer(input, 'zip input');
  const entries = [];
  const findings = [];
  function addFinding(code, message, entryIndex, entryName) {
    findings.push(makeFinding(code, message, entryIndex, entryName));
  }

  if (buffer.length > config.maxArchiveBytes) {
    addFinding(CODE.SIZE_LIMIT, 'archive byte length exceeds maxArchiveBytes', null, null);
  }
  if (buffer.length < EOCD_MIN_LENGTH) {
    addFinding(CODE.TRUNCATED, 'input is too short to contain an end of central directory record', null, null);
    return finishReport(entries, findings, buffer.length);
  }

  const eocd = locateEocd(buffer, config.rejectPolyglot);
  if (!eocd) {
    addFinding(CODE.MALFORMED_ZIP, 'end of central directory record was not found', null, null);
    return finishReport(entries, findings, buffer.length);
  }
  if (config.rejectPolyglot && eocd.end !== buffer.length) {
    addFinding(CODE.POLYGLOT, 'trailing bytes after the end of central directory are rejected', null, null);
  }

  const diskNumber = readUInt16(buffer, eocd.offset + 4);
  const centralDirectoryDisk = readUInt16(buffer, eocd.offset + 6);
  const entriesOnDisk = readUInt16(buffer, eocd.offset + 8);
  const totalEntries = readUInt16(buffer, eocd.offset + 10);
  const centralDirectorySize = readUInt32(buffer, eocd.offset + 12);
  const centralDirectoryOffset = readUInt32(buffer, eocd.offset + 16);
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries) {
    addFinding(CODE.MULTI_DISK, 'multi-disk archives are outside the supported scope', null, null);
  }
  if (
    totalEntries === UINT16_MAX || entriesOnDisk === UINT16_MAX ||
    centralDirectorySize === UINT32_MAX || centralDirectoryOffset === UINT32_MAX
  ) {
    addFinding(CODE.UNSUPPORTED_ZIP64, 'ZIP64 sentinel values are outside the supported scope', null, null);
    return finishReport(entries, findings, buffer.length);
  }
  if (totalEntries > config.maxEntries) {
    addFinding(CODE.ENTRY_LIMIT, 'entry count exceeds maxEntries', null, null);
  }

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (centralDirectoryEnd > eocd.offset) {
    addFinding(CODE.TRUNCATED, 'central directory extends beyond its end record', null, null);
    return finishReport(entries, findings, buffer.length);
  }
  if (centralDirectoryEnd !== eocd.offset) {
    addFinding(CODE.MALFORMED_ZIP, 'unexpected bytes appear between the central directory and its end record', null, null);
  }

  const parseCount = Math.min(totalEntries, config.maxEntries);
  let offset = centralDirectoryOffset;
  let parsed = 0;
  while (parsed < parseCount) {
    const parsedEntry = parseCentralEntry(buffer, offset, parsed, addFinding);
    if (!parsedEntry) break;
    if (parsedEntry.end > centralDirectoryEnd) {
      addFinding(CODE.TRUNCATED, 'central directory entry extends beyond the central directory', parsed, null);
      break;
    }
    entries.push(parsedEntry.entry);
    offset = parsedEntry.end;
    parsed += 1;
  }
  if (parsed !== totalEntries && totalEntries <= config.maxEntries) {
    addFinding(CODE.MALFORMED_ZIP, 'central directory entry count does not match the end record', null, null);
  }
  if (parsed === totalEntries && offset !== centralDirectoryEnd) {
    addFinding(CODE.MALFORMED_ZIP, 'central directory size does not match its parsed entries', null, null);
  }

  for (const entry of entries) {
    if (entry.invalidEncoding) {
      addFinding(CODE.INVALID_ENCODING, 'UTF-8 filename flag is set but filename bytes are invalid UTF-8', entry.index, entry.name);
    }
    const centralExtra = extraFieldState(entry.centralExtra);
    if (centralExtra.malformed) {
      addFinding(CODE.MALFORMED_ZIP, 'central directory extra field is malformed', entry.index, entry.name);
    }
    if (centralExtra.zip64) {
      addFinding(CODE.UNSUPPORTED_ZIP64, 'ZIP64 central extra fields are outside the supported scope', entry.index, entry.name);
    }
    if (entry.diskNumberStart !== 0) {
      addFinding(CODE.MULTI_DISK, 'entry starts on a nonzero disk number', entry.index, entry.name);
    }
    if (entry.encrypted && !config.allowEncrypted) {
      addFinding(CODE.ENCRYPTED, 'encrypted entries are rejected because plaintext size and checksum cannot be verified', entry.index, entry.name);
    }
    if ((entry.flags & UNSUPPORTED_FLAG_MASK) !== 0) {
      addFinding(CODE.UNSUPPORTED_FLAGS, 'unsupported or reserved general-purpose flag bits are set', entry.index, entry.name);
    }
    if (entry.compressionMethod === METHOD_STORED && (entry.flags & 0x0006) !== 0) {
      addFinding(CODE.UNSUPPORTED_FLAGS, 'compression-option flag bits are undefined for stored entries', entry.index, entry.name);
    }
    if (entry.compressionMethod !== METHOD_STORED && entry.compressionMethod !== METHOD_DEFLATE) {
      addFinding(CODE.UNSUPPORTED_METHOD, 'only stored and deflate compression methods can be verified', entry.index, entry.name);
    }
    validateEntryPath(entry, config, addFinding);
    validateUnixAttributes(entry, config, addFinding);
    if (entry.directory && (entry.compressedSize !== 0 || entry.uncompressedSize !== 0)) {
      addFinding(CODE.MALFORMED_ZIP, 'directory entries must not carry compressed or uncompressed file data', entry.index, entry.name);
    }
    verifyLocalRecord(buffer, entry, centralDirectoryOffset, addFinding);
  }

  if (entries.length > 0) {
    let minimumLocalOffset = Infinity;
    for (const entry of entries) minimumLocalOffset = Math.min(minimumLocalOffset, entry.localHeaderOffset);
    if (config.rejectPolyglot && minimumLocalOffset !== 0) {
      addFinding(CODE.POLYGLOT, 'prepended bytes before the first local file header are rejected', null, null);
    }
  } else if (config.rejectPolyglot && centralDirectoryOffset !== 0) {
    addFinding(CODE.POLYGLOT, 'prepended bytes before an empty central directory are rejected', null, null);
  }

  addDuplicateAndCollisionFindings(entries, config, addFinding);
  addOverlapFindings(entries, addFinding);
  addLocalLayoutFindings(buffer, entries, centralDirectoryOffset, config, addFinding);

  let totalUncompressed = 0;
  let totalCompressed = 0;
  for (const entry of entries) {
    totalUncompressed += entry.uncompressedSize;
    totalCompressed += entry.compressedSize;
    if (entry.uncompressedSize > config.maxEntryUncompressedBytes) {
      addFinding(CODE.SIZE_LIMIT, 'entry uncompressed size exceeds maxEntryUncompressedBytes', entry.index, entry.name);
    }
    if (entry.compressedSize === 0 && entry.uncompressedSize > 0) {
      addFinding(CODE.RATIO_LIMIT, 'entry claims nonzero output from zero compressed bytes', entry.index, entry.name);
    } else if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > config.maxCompressionRatio) {
      addFinding(CODE.RATIO_LIMIT, 'entry compression ratio exceeds maxCompressionRatio', entry.index, entry.name);
    }
  }
  if (totalUncompressed > config.maxTotalUncompressedBytes) {
    addFinding(CODE.SIZE_LIMIT, 'aggregate uncompressed size exceeds maxTotalUncompressedBytes', null, null);
  }
  if (totalCompressed > 0 && totalUncompressed / totalCompressed > config.maxCompressionRatio) {
    addFinding(CODE.RATIO_LIMIT, 'aggregate compression ratio exceeds maxCompressionRatio', null, null);
  }

  return finishReport(entries, findings, buffer.length);
}

export function assertSafeZipBuffer(input, options) {
  const report = inspectZipBuffer(input, options);
  if (report.safe) return report;
  const first = report.findings[0];
  const error = new ZipCageError(first.code, first.message, first.entryName === undefined ? null : first.entryName);
  error.findings = report.findings;
  throw error;
}

function compressedBytesForEntry(buffer, entry) {
  return buffer.subarray(entry.dataOffset, entry.dataEnd);
}

function inflateRawBounded(compressed, maximumOutputBytes, inputName) {
  return new Promise((resolve, reject) => {
    const inflater = createInflateRaw({ chunkSize: 64 * 1024 });
    const chunks = [];
    let outputBytes = 0;
    let checksum = 0;
    let settled = false;

    function fail(code, reason, cause) {
      if (settled) return;
      settled = true;
      inflater.destroy();
      reject(new ZipCageError(code, reason, inputName, cause));
    }

    inflater.on('data', (chunk) => {
      if (settled) return;
      outputBytes += chunk.length;
      if (outputBytes > maximumOutputBytes) {
        fail(CODE.SIZE_LIMIT, 'decompressed output exceeded the hard byte cap', undefined);
        return;
      }
      checksum = crc32Update(checksum, chunk);
      chunks.push(Buffer.from(chunk));
    });
    inflater.on('error', (error) => {
      fail(CODE.DEFLATE_ERROR, 'deflate stream is malformed or truncated', error);
    });
    inflater.on('end', () => {
      if (settled) return;
      settled = true;
      if (inflater.bytesWritten !== compressed.length) {
        reject(new ZipCageError(
          CODE.TRAILING_COMPRESSED_DATA,
          'compressed size contains bytes after the end of the deflate stream',
          inputName
        ));
        return;
      }
      resolve({
        data: Buffer.concat(chunks, outputBytes),
        uncompressedSize: outputBytes,
        crc32: checksum,
        compressedBytesConsumed: inflater.bytesWritten
      });
    });

    try {
      inflater.end(compressed);
    } catch (error) {
      fail(CODE.DEFLATE_ERROR, 'deflate stream could not be started', error);
    }
  });
}

async function decompressEntry(buffer, entry, config) {
  if (entry.encrypted) {
    throwError(CODE.ENCRYPTED, 'encrypted entries cannot be verified or decompressed', entry.name);
  }
  if (entry.compressionMethod !== METHOD_STORED && entry.compressionMethod !== METHOD_DEFLATE) {
    throwError(CODE.UNSUPPORTED_METHOD, 'entry compression method is unsupported', entry.name);
  }
  const compressed = compressedBytesForEntry(buffer, entry);
  const maximumOutputBytes = Math.min(config.maxEntryUncompressedBytes, entry.uncompressedSize);
  let result;
  if (entry.compressionMethod === METHOD_STORED) {
    if (entry.compressedSize !== entry.uncompressedSize) {
      throwError(CODE.SIZE_MISMATCH, 'stored entry compressed and uncompressed sizes differ', entry.name);
    }
    result = {
      data: Buffer.from(compressed),
      uncompressedSize: compressed.length,
      crc32: crc32(compressed),
      compressedBytesConsumed: compressed.length
    };
  } else {
    result = await inflateRawBounded(compressed, maximumOutputBytes, entry.name);
  }
  if (result.uncompressedSize !== entry.uncompressedSize) {
    throwError(CODE.SIZE_MISMATCH, 'actual decompressed size does not match the central directory', entry.name);
  }
  if (result.crc32 !== entry.crc32) {
    throwError(CODE.CRC_MISMATCH, 'actual decompressed CRC-32 does not match the central directory', entry.name);
  }
  return result.data;
}

function archiveErrorFromReport(report) {
  const first = report.findings[0];
  const error = new ZipCageError(first.code, first.message, first.entryName === undefined ? null : first.entryName);
  error.findings = report.findings;
  return error;
}

function findEntry(report, entryName) {
  if (typeof entryName !== 'string' || entryName.length === 0) {
    throwError(CODE.INVALID_INPUT, 'entryName must be a non-empty string', entryName);
  }
  const matches = report.entries.filter((entry) => entry.name === entryName || entry.normalizedName === entryName);
  if (matches.length === 0) {
    throwError(CODE.ENTRY_NOT_FOUND, 'entry was not found in the inspected archive', entryName);
  }
  if (matches.length > 1) {
    throwError(CODE.INVALID_INPUT, 'entryName is ambiguous in this archive', entryName);
  }
  return matches[0];
}

export async function readZipEntry(input, entryName, options) {
  const config = resolveOptions(null, options);
  const buffer = asBuffer(input, 'zip input');
  const report = inspectZipBuffer(buffer, config);
  if (!report.safe) throw archiveErrorFromReport(report);
  const entry = findEntry(report, entryName);
  if (entry.directory) {
    throwError(CODE.INVALID_INPUT, 'directory entries do not have file content', entryName);
  }
  if (entry.unixFileType !== 'file' && entry.unixFileType !== 'unspecified') {
    throwError(CODE.EXTRACTION_REFUSED, 'only regular file content can be read safely', entryName);
  }
  return decompressEntry(buffer, entry, config);
}

async function lstatOrNull(target) {
  try {
    return await fs.lstat(target);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function extractionFailure(code, reason, target, cause) {
  return new ZipCageError(code, reason, target, cause);
}

async function ensureDirectoryPath(root, segments) {
  let current = root;
  let created = 0;
  for (const segment of segments) {
    current = path.join(current, segment);
    let stat = await lstatOrNull(current);
    if (stat === null) {
      try {
        await fs.mkdir(current, { mode: 0o755 });
        await fs.chmod(current, 0o755);
        created += 1;
        stat = await fs.lstat(current);
      } catch (error) {
        if (!error || error.code !== 'EEXIST') {
          throw extractionFailure(CODE.EXTRACTION_FAILED, 'could not create destination directory', current, error);
        }
        stat = await lstatOrNull(current);
      }
    }
    if (stat === null) {
      throw extractionFailure(CODE.EXTRACTION_FAILED, 'destination directory disappeared during extraction', current);
    }
    if (stat.isSymbolicLink()) {
      throw extractionFailure(CODE.EXTRACTION_SYMLINK, 'refusing to traverse a symlink inside the extraction target', current);
    }
    if (!stat.isDirectory()) {
      throw extractionFailure(CODE.EXTRACTION_COLLISION, 'a non-directory blocks a required extraction directory', current);
    }
  }
  return created;
}

async function writeBufferFully(handle, buffer) {
  let offset = 0;
  while (offset < buffer.length) {
    const result = await handle.write(buffer, offset, buffer.length - offset, offset);
    offset += result.bytesWritten;
    if (result.bytesWritten === 0) {
      throwError(CODE.EXTRACTION_FAILED, 'file write made no progress', undefined);
    }
  }
}

let temporaryCounter = 0;

function temporarySibling(parent) {
  temporaryCounter = (temporaryCounter + 1) >>> 0;
  return path.join(parent, '.zipcage-' + process.pid + '-' + temporaryCounter);
}

async function installTemporaryFile(temp, destination, overwrite) {
  if (overwrite) {
    try {
      await fs.rename(temp, destination);
      return;
    } catch (error) {
      if (!error || (error.code !== 'EEXIST' && error.code !== 'EPERM' && error.code !== 'ENOTEMPTY')) {
        throw error;
      }
      await fs.unlink(destination);
      await fs.rename(temp, destination);
      return;
    }
  }
  await fs.link(temp, destination);
  await fs.unlink(temp);
}

async function extractRegularFile(buffer, entry, root, config) {
  const segments = entry.pathSegments.slice();
  const fileName = segments.pop();
  const parentRelative = segments;
  const parent = path.join(root, ...parentRelative);
  const createdParentDirectories = await ensureDirectoryPath(root, parentRelative);
  const destination = path.join(parent, fileName);
  const existing = await lstatOrNull(destination);
  if (existing !== null) {
    if (existing.isSymbolicLink()) {
      throw extractionFailure(CODE.EXTRACTION_SYMLINK, 'refusing to overwrite a symlink inside the extraction target', destination);
    }
    if (existing.isDirectory()) {
      throw extractionFailure(CODE.EXTRACTION_COLLISION, 'a directory already occupies a file extraction path', destination);
    }
    if (!config.overwrite) {
      throw extractionFailure(CODE.EXTRACTION_OVERWRITE, 'destination exists and overwrite is false', destination);
    }
    if (!existing.isFile()) {
      throw extractionFailure(CODE.EXTRACTION_COLLISION, 'a special filesystem object occupies a file extraction path', destination);
    }
  }

  const data = await decompressEntry(buffer, entry, config);
  const temp = temporarySibling(parent);
  let handle = null;
  try {
    handle = await fs.open(temp, 'wx', 0o644);
    await writeBufferFully(handle, data);
    await handle.sync();
    await handle.chmod(0o644);
    await handle.close();
    handle = null;
    const raced = await lstatOrNull(destination);
    if (raced !== null && raced.isSymbolicLink()) {
      throw extractionFailure(CODE.EXTRACTION_SYMLINK, 'refusing to overwrite a symlink inside the extraction target', destination);
    }
    if (raced !== null && !config.overwrite) {
      throw extractionFailure(CODE.EXTRACTION_OVERWRITE, 'destination appeared during extraction and overwrite is false', destination);
    }
    await installTemporaryFile(temp, destination, config.overwrite);
  } catch (error) {
    try {
      if (handle !== null) await handle.close();
    } catch {}
    try {
      await fs.unlink(temp);
    } catch {}
    if (error instanceof ZipCageError) throw error;
    throw extractionFailure(CODE.EXTRACTION_FAILED, 'atomic extraction write failed', destination, error);
  }
  return { path: destination, bytes: data.length, directoriesCreated: createdParentDirectories };
}

export async function extractZipBuffer(input, targetDir, options) {
  const config = resolveOptions(null, options);
  if (typeof targetDir !== 'string' || targetDir.length === 0 || targetDir.includes('\0')) {
    throwError(CODE.INVALID_INPUT, 'targetDir must be a non-empty path string without NUL bytes', targetDir);
  }
  const buffer = asBuffer(input, 'zip input');
  const report = inspectZipBuffer(buffer, config);
  if (!report.safe) throw archiveErrorFromReport(report);
  for (const entry of report.entries) {
    if (entry.encrypted || (entry.unixFileType !== 'file' && entry.unixFileType !== 'directory' && entry.unixFileType !== 'unspecified')) {
      throwError(CODE.EXTRACTION_REFUSED, 'safe extraction never writes symlinks, devices, FIFOs or sockets', entry.name);
    }
  }

  let root;
  try {
    root = await fs.realpath(targetDir);
  } catch (error) {
    throw extractionFailure(CODE.EXTRACTION_FAILED, 'targetDir cannot be resolved with realpath', targetDir, error);
  }
  const rootStat = await lstatOrNull(root);
  if (rootStat === null || !rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw extractionFailure(CODE.EXTRACTION_FAILED, 'targetDir must resolve to a real directory', targetDir);
  }

  const written = [];
  const directories = [];
  let createdDirectories = 0;
  let bytesWritten = 0;
  for (const entry of report.entries) {
    if (entry.directory) {
      createdDirectories += await ensureDirectoryPath(root, entry.pathSegments);
      const destination = path.join(root, ...entry.pathSegments);
      directories.push(destination);
      continue;
    }
    const result = await extractRegularFile(buffer, entry, root, config);
    createdDirectories += result.directoriesCreated;
    written.push(Object.freeze({ name: entry.name, path: result.path, bytes: result.bytes }));
    bytesWritten += result.bytes;
  }

  return Object.freeze({
    targetDir: root,
    entriesWritten: written.length,
    directoriesCreated: createdDirectories,
    bytesWritten,
    files: Object.freeze(written),
    directories: Object.freeze(directories),
    report
  });
}

function normalizeBuilderMethod(value) {
  if (value === undefined || value === null) return METHOD_STORED;
  if (value === METHOD_STORED || value === 'stored' || value === 'store') return METHOD_STORED;
  if (value === METHOD_DEFLATE || value === 'deflate') return METHOD_DEFLATE;
  throwError(CODE.INVALID_INPUT, 'ZIP entry method must be 0, 8, stored or deflate', value);
}

function builderUint32(value, fallback, label) {
  if (value === undefined) return fallback >>> 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > UINT32_MAX) {
    throwError(CODE.INVALID_INPUT, label + ' must be an unsigned 32-bit integer', value);
  }
  return value >>> 0;
}

function builderUint16(value, fallback, label) {
  if (value === undefined) return fallback & 0xffff;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > UINT16_MAX) {
    throwError(CODE.INVALID_INPUT, label + ' must be an unsigned 16-bit integer', value);
  }
  return value & 0xffff;
}

function localHeaderBytes(values) {
  const output = Buffer.alloc(LOCAL_FIXED_LENGTH);
  output.writeUInt32LE(LOCAL_SIGNATURE, 0);
  output.writeUInt16LE(values.versionNeeded, 4);
  output.writeUInt16LE(values.flags, 6);
  output.writeUInt16LE(values.method, 8);
  output.writeUInt16LE(values.dosTime, 10);
  output.writeUInt16LE(values.dosDate, 12);
  output.writeUInt32LE(values.crc32, 14);
  output.writeUInt32LE(values.compressedSize, 18);
  output.writeUInt32LE(values.uncompressedSize, 22);
  output.writeUInt16LE(values.fileNameLength, 26);
  output.writeUInt16LE(values.extraLength, 28);
  return output;
}

function centralHeaderBytes(values) {
  const output = Buffer.alloc(CENTRAL_FIXED_LENGTH);
  output.writeUInt32LE(CENTRAL_SIGNATURE, 0);
  output.writeUInt16LE(values.versionMadeBy, 4);
  output.writeUInt16LE(values.versionNeeded, 6);
  output.writeUInt16LE(values.flags, 8);
  output.writeUInt16LE(values.method, 10);
  output.writeUInt16LE(values.dosTime, 12);
  output.writeUInt16LE(values.dosDate, 14);
  output.writeUInt32LE(values.crc32, 16);
  output.writeUInt32LE(values.compressedSize, 20);
  output.writeUInt32LE(values.uncompressedSize, 24);
  output.writeUInt16LE(values.fileNameLength, 28);
  output.writeUInt16LE(values.extraLength, 30);
  output.writeUInt16LE(values.commentLength, 32);
  output.writeUInt16LE(values.diskNumberStart, 34);
  output.writeUInt16LE(values.internalAttributes, 36);
  output.writeUInt32LE(values.externalAttributes, 38);
  output.writeUInt32LE(values.localHeaderOffset, 42);
  return output;
}

export function createZipBuffer(entries, options) {
  if (!Array.isArray(entries)) {
    throwError(CODE.INVALID_INPUT, 'entries must be an array', entries);
  }
  const builderOptions = isPlainObject(options) ? options : Object.create(null);
  if (options !== undefined && !isPlainObject(options)) {
    throwError(CODE.INVALID_INPUT, 'createZipBuffer options must be a plain object', options);
  }
  const builderOptionKeys = new Set(['validate', 'prependBytes', 'trailingBytes', 'comment']);
  for (const key of Object.keys(builderOptions)) {
    if (!builderOptionKeys.has(key)) throwError(CODE.INVALID_INPUT, 'unknown createZipBuffer option key: ' + key, key);
  }
  const builderEntryKeys = new Set([
    'name', 'nameBytes', 'localNameBytes', 'data', 'method', 'compressedData', 'directory', 'utf8',
    'dataDescriptor', 'mode', 'unixMode', 'externalAttributes', 'dosTime', 'dosDate', 'versionNeeded',
    'versionMadeBy', 'flags', 'centralFlags', 'localFlags', 'crc32', 'centralCrc32', 'localCrc32',
    'compressedSize', 'centralCompressedSize', 'localCompressedSize', 'uncompressedSize',
    'centralUncompressedSize', 'localUncompressedSize', 'centralMethod', 'localMethod', 'localExtra',
    'centralExtra', 'comment', 'writeLocal', 'centralLocalHeaderOffset'
  ]);
  const validate = own(builderOptions, 'validate') === undefined ? true : own(builderOptions, 'validate');
  if (typeof validate !== 'boolean') throwError(CODE.INVALID_INPUT, 'validate must be a boolean', validate);
  const prefix = bytesFrom(own(builderOptions, 'prependBytes'), 'prependBytes');
  const trailing = bytesFrom(own(builderOptions, 'trailingBytes'), 'trailingBytes');
  const comment = bytesFrom(own(builderOptions, 'comment'), 'comment');
  if (entries.length > UINT16_MAX) throwError(CODE.INVALID_INPUT, 'classic ZIP supports at most 65535 entries', entries.length);
  if (comment.length > UINT16_MAX) throwError(CODE.INVALID_INPUT, 'ZIP comments are limited to 65535 bytes', comment.length);

  const prepared = [];
  for (let index = 0; index < entries.length; index += 1) {
    const input = entries[index];
    if (!isPlainObject(input)) throwError(CODE.INVALID_INPUT, 'each ZIP entry must be a plain object', input);
    for (const key of Object.keys(input)) {
      if (!builderEntryKeys.has(key)) throwError(CODE.INVALID_INPUT, 'unknown ZIP builder entry key: ' + key, key);
    }
    const nameValue = own(input, 'name');
    const centralNameBytes = own(input, 'nameBytes') !== undefined
      ? bytesFrom(own(input, 'nameBytes'), 'nameBytes')
      : bytesFrom(nameValue, 'entry name');
    if (centralNameBytes.length > UINT16_MAX) throwError(CODE.INVALID_INPUT, 'entry name is too long for classic ZIP', nameValue);
    const localNameBytes = own(input, 'localNameBytes') !== undefined
      ? bytesFrom(own(input, 'localNameBytes'), 'localNameBytes')
      : centralNameBytes;
    if (localNameBytes.length > UINT16_MAX) throwError(CODE.INVALID_INPUT, 'local entry name is too long for classic ZIP', nameValue);
    const data = bytesFrom(own(input, 'data'), 'entry data');
    const method = normalizeBuilderMethod(own(input, 'method'));
    const compressed = own(input, 'compressedData') !== undefined
      ? Buffer.from(bytesFrom(own(input, 'compressedData'), 'compressedData'))
      : method === METHOD_DEFLATE
        ? deflateRawSync(data, { level: 9 })
        : Buffer.from(data);
    const directory = own(input, 'directory') === true || (typeof nameValue === 'string' && nameValue.endsWith('/'));
    const utf8 = own(input, 'utf8') === undefined ? true : own(input, 'utf8') === true;
    const dataDescriptor = own(input, 'dataDescriptor') === true;
    let flags = (utf8 ? FLAG_UTF8 : 0) | (dataDescriptor ? FLAG_DATA_DESCRIPTOR : 0);
    const centralFlags = builderUint16(own(input, 'centralFlags'), builderUint16(own(input, 'flags'), flags, 'flags'), 'centralFlags');
    const localFlags = builderUint16(own(input, 'localFlags'), centralFlags, 'localFlags');
    const dosTime = builderUint16(own(input, 'dosTime'), 0, 'dosTime');
    const dosDate = builderUint16(own(input, 'dosDate'), 33, 'dosDate');
    const actualCrc = crc32(data);
    const actualCompressedSize = compressed.length >>> 0;
    const actualUncompressedSize = data.length >>> 0;
    const centralCrc = builderUint32(own(input, 'centralCrc32'), builderUint32(own(input, 'crc32'), actualCrc, 'crc32'), 'centralCrc32');
    const localCrc = builderUint32(own(input, 'localCrc32'), dataDescriptor ? 0 : centralCrc, 'localCrc32');
    const centralCompressedSize = builderUint32(
      own(input, 'centralCompressedSize'),
      builderUint32(own(input, 'compressedSize'), actualCompressedSize, 'compressedSize'),
      'centralCompressedSize'
    );
    const localCompressedSize = builderUint32(own(input, 'localCompressedSize'), dataDescriptor ? 0 : centralCompressedSize, 'localCompressedSize');
    const centralUncompressedSize = builderUint32(
      own(input, 'centralUncompressedSize'),
      builderUint32(own(input, 'uncompressedSize'), actualUncompressedSize, 'uncompressedSize'),
      'centralUncompressedSize'
    );
    const localUncompressedSize = builderUint32(own(input, 'localUncompressedSize'), dataDescriptor ? 0 : centralUncompressedSize, 'localUncompressedSize');
    const centralMethod = builderUint16(own(input, 'centralMethod'), method, 'centralMethod');
    const localMethod = builderUint16(own(input, 'localMethod'), centralMethod, 'localMethod');
    const versionNeeded = builderUint16(own(input, 'versionNeeded'), method === METHOD_DEFLATE ? 20 : 10, 'versionNeeded');
    const versionMadeBy = builderUint16(own(input, 'versionMadeBy'), (3 << 8) | versionNeeded, 'versionMadeBy');
    const mode = own(input, 'mode') === undefined ? (directory ? 0o755 : 0o644) : own(input, 'mode');
    if (typeof mode !== 'number' || !Number.isSafeInteger(mode) || mode < 0 || mode > 0o7777) {
      throwError(CODE.INVALID_INPUT, 'entry mode must contain only permission and special bits', mode);
    }
    const unixMode = own(input, 'unixMode') === undefined
      ? (directory ? 0o040000 : 0o100000) | mode
      : own(input, 'unixMode');
    if (typeof unixMode !== 'number' || !Number.isSafeInteger(unixMode) || unixMode < 0 || unixMode > 0xffff) {
      throwError(CODE.INVALID_INPUT, 'unixMode must be an unsigned 16-bit mode', unixMode);
    }
    const externalAttributes = own(input, 'externalAttributes') === undefined
      ? (((unixMode & 0xffff) * 0x10000) + (directory ? 0x10 : 0)) >>> 0
      : builderUint32(own(input, 'externalAttributes'), 0, 'externalAttributes');
    const localExtra = bytesFrom(own(input, 'localExtra'), 'localExtra');
    const centralExtra = bytesFrom(own(input, 'centralExtra'), 'centralExtra');
    const entryComment = bytesFrom(own(input, 'comment'), 'entry comment');
    if (localExtra.length > UINT16_MAX || centralExtra.length > UINT16_MAX || entryComment.length > UINT16_MAX) {
      throwError(CODE.INVALID_INPUT, 'extra fields and entry comments are limited to 65535 bytes', nameValue);
    }

    prepared.push(Object.freeze({
      index,
      name: typeof nameValue === 'string' ? nameValue : '<binary>',
      centralNameBytes,
      localNameBytes,
      compressed,
      directory,
      writeLocal: own(input, 'writeLocal') !== false,
      centralLocalHeaderOffset: own(input, 'centralLocalHeaderOffset'),
      centralFlags,
      localFlags,
      dosTime,
      dosDate,
      centralCrc,
      localCrc,
      centralCompressedSize,
      localCompressedSize,
      centralUncompressedSize,
      localUncompressedSize,
      centralMethod,
      localMethod,
      versionNeeded,
      versionMadeBy,
      externalAttributes,
      localExtra,
      centralExtra,
      entryComment,
      dataDescriptor
    }));
  }

  const localParts = [];
  let offset = prefix.length;
  const actualOffsets = [];
  for (const entry of prepared) {
    if (!entry.writeLocal) {
      actualOffsets.push(null);
      continue;
    }
    actualOffsets.push(offset);
    const header = localHeaderBytes({
      versionNeeded: entry.versionNeeded,
      flags: entry.localFlags,
      method: entry.localMethod,
      dosTime: entry.dosTime,
      dosDate: entry.dosDate,
      crc32: entry.localCrc,
      compressedSize: entry.localCompressedSize,
      uncompressedSize: entry.localUncompressedSize,
      fileNameLength: entry.localNameBytes.length,
      extraLength: entry.localExtra.length
    });
    localParts.push(header, entry.localNameBytes, entry.localExtra, entry.compressed);
    offset += header.length + entry.localNameBytes.length + entry.localExtra.length + entry.compressed.length;
    if (entry.dataDescriptor) {
      const descriptor = Buffer.alloc(16);
      descriptor.writeUInt32LE(DATA_DESCRIPTOR_SIGNATURE, 0);
      descriptor.writeUInt32LE(entry.centralCrc, 4);
      descriptor.writeUInt32LE(entry.centralCompressedSize, 8);
      descriptor.writeUInt32LE(entry.centralUncompressedSize, 12);
      localParts.push(descriptor);
      offset += descriptor.length;
    }
    if (offset > UINT32_MAX) throwError(CODE.INVALID_INPUT, 'classic ZIP offsets cannot exceed 32 bits', entry.name);
  }

  const centralOffset = offset;
  const centralParts = [];
  for (let index = 0; index < prepared.length; index += 1) {
    const entry = prepared[index];
    const localOffset = entry.centralLocalHeaderOffset === undefined
      ? actualOffsets[index]
      : builderUint32(entry.centralLocalHeaderOffset, 0, 'centralLocalHeaderOffset');
    if (localOffset === null || localOffset === undefined) {
      throwError(CODE.INVALID_INPUT, 'writeLocal false requires centralLocalHeaderOffset', entry.name);
    }
    const central = centralHeaderBytes({
      versionMadeBy: entry.versionMadeBy,
      versionNeeded: entry.versionNeeded,
      flags: entry.centralFlags,
      method: entry.centralMethod,
      dosTime: entry.dosTime,
      dosDate: entry.dosDate,
      crc32: entry.centralCrc,
      compressedSize: entry.centralCompressedSize,
      uncompressedSize: entry.centralUncompressedSize,
      fileNameLength: entry.centralNameBytes.length,
      extraLength: entry.centralExtra.length,
      commentLength: entry.entryComment.length,
      diskNumberStart: 0,
      internalAttributes: 0,
      externalAttributes: entry.externalAttributes,
      localHeaderOffset: localOffset
    });
    centralParts.push(central, entry.centralNameBytes, entry.centralExtra, entry.entryComment);
    offset += central.length + entry.centralNameBytes.length + entry.centralExtra.length + entry.entryComment.length;
  }
  const centralSize = offset - centralOffset;

  const eocd = Buffer.alloc(EOCD_MIN_LENGTH);
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(prepared.length, 8);
  eocd.writeUInt16LE(prepared.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(comment.length, 20);

  const output = Buffer.concat([prefix, ...localParts, ...centralParts, eocd, comment, trailing]);
  if (validate) {
    const report = inspectZipBuffer(output);
    if (!report.safe) throw archiveErrorFromReport(report);
  }
  return output;
}

export function createZipGuard(options) {
  const config = resolveOptions(null, options);
  const guard = Object.create(null);
  guard.inspect = (input, overrides) => inspectZipBuffer(input, resolveOptions(config, overrides));
  guard.assertSafe = (input, overrides) => assertSafeZipBuffer(input, resolveOptions(config, overrides));
  guard.readEntry = (input, entryName, overrides) => readZipEntry(input, entryName, resolveOptions(config, overrides));
  guard.extract = (input, targetDir, overrides) => extractZipBuffer(input, targetDir, resolveOptions(config, overrides));
  guard.options = config;
  return Object.freeze(guard);
}

const zipcage = Object.freeze({
  CODE,
  ZipCageError,
  inspectZipBuffer,
  assertSafeZipBuffer,
  readZipEntry,
  extractZipBuffer,
  createZipBuffer,
  createZipGuard
});

export default zipcage;
