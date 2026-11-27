/// <reference types="node" />

/** Error codes emitted by zipcage. */
export const CODE: Readonly<{
  INVALID_INPUT: 'ERR_ZIPCAGE_INVALID_INPUT';
  INVALID_OPTIONS: 'ERR_ZIPCAGE_INVALID_OPTIONS';
  MALFORMED_ZIP: 'ERR_ZIPCAGE_MALFORMED_ZIP';
  TRUNCATED: 'ERR_ZIPCAGE_TRUNCATED';
  UNSUPPORTED_ZIP64: 'ERR_ZIPCAGE_UNSUPPORTED_ZIP64';
  MULTI_DISK: 'ERR_ZIPCAGE_MULTI_DISK';
  POLYGLOT: 'ERR_ZIPCAGE_POLYGLOT';
  ENTRY_LIMIT: 'ERR_ZIPCAGE_ENTRY_LIMIT';
  SIZE_LIMIT: 'ERR_ZIPCAGE_SIZE_LIMIT';
  RATIO_LIMIT: 'ERR_ZIPCAGE_RATIO_LIMIT';
  OVERLAPPING_DATA: 'ERR_ZIPCAGE_OVERLAPPING_DATA';
  INVALID_ENCODING: 'ERR_ZIPCAGE_INVALID_ENCODING';
  EMPTY_PATH: 'ERR_ZIPCAGE_EMPTY_PATH';
  PATH_TOO_DEEP: 'ERR_ZIPCAGE_PATH_TOO_DEEP';
  PATH_TOO_LONG: 'ERR_ZIPCAGE_PATH_TOO_LONG';
  CONTROL_CHARACTER: 'ERR_ZIPCAGE_CONTROL_CHARACTER';
  PATH_TRAVERSAL: 'ERR_ZIPCAGE_PATH_TRAVERSAL';
  ABSOLUTE_PATH: 'ERR_ZIPCAGE_ABSOLUTE_PATH';
  DRIVE_PATH: 'ERR_ZIPCAGE_DRIVE_PATH';
  UNC_PATH: 'ERR_ZIPCAGE_UNC_PATH';
  EMPTY_PATH_SEGMENT: 'ERR_ZIPCAGE_EMPTY_PATH_SEGMENT';
  RESERVED_NAME: 'ERR_ZIPCAGE_RESERVED_NAME';
  TRAILING_DOT_OR_SPACE: 'ERR_ZIPCAGE_TRAILING_DOT_OR_SPACE';
  PROTOTYPE_POLLUTION: 'ERR_ZIPCAGE_PROTOTYPE_POLLUTION';
  DUPLICATE_PATH: 'ERR_ZIPCAGE_DUPLICATE_PATH';
  FILE_DIRECTORY_COLLISION: 'ERR_ZIPCAGE_FILE_DIRECTORY_COLLISION';
  SYMLINK: 'ERR_ZIPCAGE_SYMLINK';
  SPECIAL_FILE: 'ERR_ZIPCAGE_SPECIAL_FILE';
  SUID_SGID: 'ERR_ZIPCAGE_SUID_SGID';
  ENCRYPTED: 'ERR_ZIPCAGE_ENCRYPTED';
  UNSUPPORTED_METHOD: 'ERR_ZIPCAGE_UNSUPPORTED_METHOD';
  UNSUPPORTED_FLAGS: 'ERR_ZIPCAGE_UNSUPPORTED_FLAGS';
  HEADER_MISMATCH: 'ERR_ZIPCAGE_HEADER_MISMATCH';
  CRC_MISMATCH: 'ERR_ZIPCAGE_CRC_MISMATCH';
  SIZE_MISMATCH: 'ERR_ZIPCAGE_SIZE_MISMATCH';
  DEFLATE_ERROR: 'ERR_ZIPCAGE_DEFLATE_ERROR';
  TRAILING_COMPRESSED_DATA: 'ERR_ZIPCAGE_TRAILING_COMPRESSED_DATA';
  ENTRY_NOT_FOUND: 'ERR_ZIPCAGE_ENTRY_NOT_FOUND';
  EXTRACTION_REFUSED: 'ERR_ZIPCAGE_EXTRACTION_REFUSED';
  EXTRACTION_SYMLINK: 'ERR_ZIPCAGE_EXTRACTION_SYMLINK';
  EXTRACTION_COLLISION: 'ERR_ZIPCAGE_EXTRACTION_COLLISION';
  EXTRACTION_OVERWRITE: 'ERR_ZIPCAGE_EXTRACTION_OVERWRITE';
  EXTRACTION_FAILED: 'ERR_ZIPCAGE_EXTRACTION_FAILED';
}>;

export type ZipCageErrorCode =
  'ERR_ZIPCAGE_INVALID_INPUT' | 'ERR_ZIPCAGE_INVALID_OPTIONS' |
  'ERR_ZIPCAGE_MALFORMED_ZIP' | 'ERR_ZIPCAGE_TRUNCATED' |
  'ERR_ZIPCAGE_UNSUPPORTED_ZIP64' | 'ERR_ZIPCAGE_MULTI_DISK' |
  'ERR_ZIPCAGE_POLYGLOT' | 'ERR_ZIPCAGE_ENTRY_LIMIT' |
  'ERR_ZIPCAGE_SIZE_LIMIT' | 'ERR_ZIPCAGE_RATIO_LIMIT' |
  'ERR_ZIPCAGE_OVERLAPPING_DATA' | 'ERR_ZIPCAGE_INVALID_ENCODING' |
  'ERR_ZIPCAGE_EMPTY_PATH' | 'ERR_ZIPCAGE_PATH_TOO_DEEP' |
  'ERR_ZIPCAGE_PATH_TOO_LONG' | 'ERR_ZIPCAGE_CONTROL_CHARACTER' |
  'ERR_ZIPCAGE_PATH_TRAVERSAL' | 'ERR_ZIPCAGE_ABSOLUTE_PATH' |
  'ERR_ZIPCAGE_DRIVE_PATH' | 'ERR_ZIPCAGE_UNC_PATH' |
  'ERR_ZIPCAGE_EMPTY_PATH_SEGMENT' | 'ERR_ZIPCAGE_RESERVED_NAME' |
  'ERR_ZIPCAGE_TRAILING_DOT_OR_SPACE' | 'ERR_ZIPCAGE_PROTOTYPE_POLLUTION' |
  'ERR_ZIPCAGE_DUPLICATE_PATH' | 'ERR_ZIPCAGE_FILE_DIRECTORY_COLLISION' |
  'ERR_ZIPCAGE_SYMLINK' | 'ERR_ZIPCAGE_SPECIAL_FILE' |
  'ERR_ZIPCAGE_SUID_SGID' | 'ERR_ZIPCAGE_ENCRYPTED' |
  'ERR_ZIPCAGE_UNSUPPORTED_METHOD' | 'ERR_ZIPCAGE_UNSUPPORTED_FLAGS' |
  'ERR_ZIPCAGE_HEADER_MISMATCH' | 'ERR_ZIPCAGE_CRC_MISMATCH' |
  'ERR_ZIPCAGE_SIZE_MISMATCH' | 'ERR_ZIPCAGE_DEFLATE_ERROR' |
  'ERR_ZIPCAGE_TRAILING_COMPRESSED_DATA' | 'ERR_ZIPCAGE_ENTRY_NOT_FOUND' |
  'ERR_ZIPCAGE_EXTRACTION_REFUSED' | 'ERR_ZIPCAGE_EXTRACTION_SYMLINK' |
  'ERR_ZIPCAGE_EXTRACTION_COLLISION' | 'ERR_ZIPCAGE_EXTRACTION_OVERWRITE' |
  'ERR_ZIPCAGE_EXTRACTION_FAILED';

/** Structured error thrown by assertion, read, extraction and configuration APIs. */
export declare class ZipCageError extends Error {
  constructor(code: ZipCageErrorCode | string, reason: string, input: unknown, cause?: unknown);
  readonly name: 'ZipCageError';
  readonly code: ZipCageErrorCode | string;
  readonly reason: string;
  readonly input: unknown;
  readonly cause?: unknown;
  findings?: readonly ZipCageFinding[];
  toJSON(): { name: string; code: string; reason: string; input: unknown };
}

export type ZipCageInput = Buffer | Uint8Array | ArrayBuffer | DataView;

export interface ZipCageOptions {
  /** Maximum central-directory entries. Default 1000. */
  maxEntries?: number;
  /** Maximum declared or actual uncompressed bytes for one file. Default 52428800. */
  maxEntryUncompressedBytes?: number;
  /** Maximum aggregate uncompressed bytes declared by the archive. Default 209715200. */
  maxTotalUncompressedBytes?: number;
  /** Maximum per-entry and aggregate compression ratio. Default 100. */
  maxCompressionRatio?: number;
  /** Maximum input archive byte length. Default 536870912. */
  maxArchiveBytes?: number;
  /** Maximum number of path segments. Default 20. */
  maxDepth?: number;
  /** Maximum UTF-8 byte length of an entry path. Default 512. */
  maxPathLength?: number;
  /** Permit symlinks in inspection reports. Safe extraction still refuses them. Default false. */
  allowSymlinks?: boolean;
  /** Permit FIFO, socket, device and unknown special types in inspection reports. Safe extraction still refuses them. Default false. */
  allowSpecialFiles?: boolean;
  /** Permit setuid or setgid mode bits during inspection. Extraction writes 0644 and 0755 modes regardless. Default false. */
  allowSuidSgid?: boolean;
  /** Permit encrypted entries in inspection reports. They still cannot be read or extracted. Default false. */
  allowEncrypted?: boolean;
  /** Permit path segments named __proto__, constructor or prototype. Default false. */
  allowPrototypePollutingNames?: boolean;
  /** Reject paths that differ only by case or Unicode normalization. Default true. */
  caseInsensitiveDuplicates?: boolean;
  /** Reject prepended and trailing polyglot bytes. Default true. */
  rejectPolyglot?: boolean;
  /** Allow extraction to replace an existing regular file. Symlinks are never replaced. Default false. */
  overwrite?: boolean;
}

export interface ZipCageFinding {
  readonly code: ZipCageErrorCode | string;
  readonly severity: 'error';
  readonly message: string;
  readonly entryIndex?: number;
  readonly entryName?: string;
}

export type ZipCageUnixFileType =
  'file' | 'directory' | 'symlink' | 'fifo' | 'socket' |
  'block-device' | 'character-device' | 'unspecified' | 'unknown';

export interface ZipCageEntryReport {
  readonly index: number;
  readonly name: string;
  readonly normalizedName: string;
  readonly pathSegments: readonly string[];
  readonly directory: boolean;
  readonly versionMadeBy: number;
  readonly versionNeeded: number;
  readonly flags: number;
  readonly encrypted: boolean;
  readonly utf8: boolean;
  readonly dataDescriptor: boolean;
  readonly compressionMethod: number;
  readonly compressionMethodName: 'stored' | 'deflate' | 'unsupported';
  readonly dosTime: number;
  readonly dosDate: number;
  readonly crc32: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly compressionRatio: number;
  readonly fileNameLength: number;
  readonly extraLength: number;
  readonly commentLength: number;
  readonly diskNumberStart: number;
  readonly internalAttributes: number;
  readonly externalAttributes: number;
  readonly unixMode: number;
  readonly unixFileType: ZipCageUnixFileType;
  readonly localHeaderOffset: number;
  readonly dataOffset: number | null;
  readonly dataEnd: number | null;
  readonly localVersionNeeded?: number;
  readonly localFlags?: number;
  readonly localCompressionMethod?: number;
  readonly localCrc32?: number;
  readonly localCompressedSize?: number;
  readonly localUncompressedSize?: number;
  readonly localExtraLength?: number;
  readonly invalidEncoding: boolean;
}

export interface ZipCageTotals {
  readonly entries: number;
  readonly files: number;
  readonly directories: number;
  readonly compressedBytes: number;
  readonly uncompressedBytes: number;
  readonly archiveBytes: number;
  readonly compressionRatio: number;
  readonly maximumEntryCompressionRatio: number;
}

export interface ZipCageReport {
  readonly safe: boolean;
  readonly entries: readonly ZipCageEntryReport[];
  readonly findings: readonly ZipCageFinding[];
  readonly totals: ZipCageTotals;
}

export interface ZipCageWrittenFile {
  readonly name: string;
  readonly path: string;
  readonly bytes: number;
}

export interface ZipCageExtractionResult {
  readonly targetDir: string;
  readonly entriesWritten: number;
  readonly directoriesCreated: number;
  readonly bytesWritten: number;
  readonly files: readonly ZipCageWrittenFile[];
  readonly directories: readonly string[];
  readonly report: ZipCageReport;
}

export type ZipBuilderMethod = 0 | 8 | 'stored' | 'store' | 'deflate';

export interface ZipBuilderEntry {
  /** Central-directory filename. Strings are UTF-8 encoded. */
  name?: string | Buffer | Uint8Array;
  /** Raw central filename bytes for adversarial fixtures. Overrides the encoded name. */
  nameBytes?: string | Buffer | Uint8Array;
  /** Raw local filename bytes. Defaults to nameBytes. */
  localNameBytes?: string | Buffer | Uint8Array;
  data?: string | Buffer | Uint8Array | ArrayBuffer | DataView;
  method?: ZipBuilderMethod;
  /** Raw compressed bytes. Useful for corrupted, truncated or deceptive-stream fixtures. */
  compressedData?: string | Buffer | Uint8Array | ArrayBuffer | DataView;
  directory?: boolean;
  utf8?: boolean;
  dataDescriptor?: boolean;
  mode?: number;
  unixMode?: number;
  externalAttributes?: number;
  dosTime?: number;
  dosDate?: number;
  versionNeeded?: number;
  versionMadeBy?: number;
  flags?: number;
  centralFlags?: number;
  localFlags?: number;
  crc32?: number;
  centralCrc32?: number;
  localCrc32?: number;
  compressedSize?: number;
  centralCompressedSize?: number;
  localCompressedSize?: number;
  uncompressedSize?: number;
  centralUncompressedSize?: number;
  localUncompressedSize?: number;
  centralMethod?: number;
  localMethod?: number;
  localExtra?: string | Buffer | Uint8Array;
  centralExtra?: string | Buffer | Uint8Array;
  comment?: string | Buffer | Uint8Array;
  /** Omit the local record. Requires centralLocalHeaderOffset. For adversarial fixtures only. */
  writeLocal?: boolean;
  /** Central-directory local-header offset override. For overlapping and aliasing fixtures only. */
  centralLocalHeaderOffset?: number;
}

export interface ZipBuilderOptions {
  /** Validate the output with default zipcage security policy. Default true. */
  validate?: boolean;
  /** Bytes placed before the first record. Offsets are adjusted so the result is structurally parseable. */
  prependBytes?: string | Buffer | Uint8Array;
  /** Bytes appended after the end of central directory. */
  trailingBytes?: string | Buffer | Uint8Array;
  /** Archive comment bytes, at most 65535 bytes. */
  comment?: string | Buffer | Uint8Array;
}

export interface ZipCageGuard {
  readonly options: Readonly<Required<ZipCageOptions>>;
  inspect(input: ZipCageInput, overrides?: ZipCageOptions): ZipCageReport;
  assertSafe(input: ZipCageInput, overrides?: ZipCageOptions): ZipCageReport;
  readEntry(input: ZipCageInput, entryName: string, overrides?: ZipCageOptions): Promise<Buffer>;
  extract(input: ZipCageInput, targetDir: string, overrides?: ZipCageOptions): Promise<ZipCageExtractionResult>;
}

/** Inspect a ZIP buffer without throwing for hostile archive content. Input and option type errors still throw. */
export declare function inspectZipBuffer(input: ZipCageInput, options?: ZipCageOptions): ZipCageReport;
/** Inspect a ZIP buffer and throw ZipCageError with findings when a security check fails. */
export declare function assertSafeZipBuffer(input: ZipCageInput, options?: ZipCageOptions): ZipCageReport;
/** Read one regular file entry with bounded streaming inflation, exact size verification and CRC-32 verification. */
export declare function readZipEntry(input: ZipCageInput, entryName: string, options?: ZipCageOptions): Promise<Buffer>;
/** Safely extract a verified archive into an existing target directory. */
export declare function extractZipBuffer(input: ZipCageInput, targetDir: string, options?: ZipCageOptions): Promise<ZipCageExtractionResult>;
/** Build a deterministic classic ZIP buffer for tests, fixtures and small utility archives. */
export declare function createZipBuffer(entries: readonly ZipBuilderEntry[], options?: ZipBuilderOptions): Buffer;
/** Create a reusable frozen guard with validated configuration. */
export declare function createZipGuard(options?: ZipCageOptions): ZipCageGuard;

declare const zipcage: {
  CODE: typeof CODE;
  ZipCageError: typeof ZipCageError;
  inspectZipBuffer: typeof inspectZipBuffer;
  assertSafeZipBuffer: typeof assertSafeZipBuffer;
  readZipEntry: typeof readZipEntry;
  extractZipBuffer: typeof extractZipBuffer;
  createZipBuffer: typeof createZipBuffer;
  createZipGuard: typeof createZipGuard;
};

export default zipcage;
