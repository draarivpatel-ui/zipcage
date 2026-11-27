import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {
  inspectZipBuffer,
  assertSafeZipBuffer,
  readZipEntry,
  CODE
} from '../src/index.mjs';
import {
  zip,
  deflate,
  crc32,
  findEocd,
  centralDirectoryOffset,
  patchUInt16,
  patchUInt32,
  patchByte,
  hasFinding,
  findingCodes
} from './helpers.mjs';

function single(entries, options) {
  return inspectZipBuffer(zip(entries), options);
}

test('empty input is truncated', () => {
  const report = inspectZipBuffer(Buffer.alloc(0));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.TRUNCATED), true);
});

for (const length of [1, 4, 10, 21]) {
  test('short input is truncated at length ' + length, () => {
    const report = inspectZipBuffer(Buffer.alloc(length));
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.TRUNCATED), true);
  });
}

test('random bytes without EOCD are malformed', () => {
  const report = inspectZipBuffer(Buffer.from('this is not a zip archive at all'));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MALFORMED_ZIP), true);
});

test('valid empty archive is accepted', () => {
  const report = inspectZipBuffer(zip([]));
  assert.equal(report.safe, true, JSON.stringify(report.findings));
  assert.equal(report.totals.entries, 0);
});

test('archive comment is valid ZIP structure', () => {
  const report = inspectZipBuffer(zip([], { comment: 'plain archive comment' }));
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('trailing polyglot byte is rejected by default', () => {
  const report = inspectZipBuffer(zip([], { trailingBytes: 'x' }));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.POLYGLOT), true);
});

test('trailing polyglot bytes can be inspected when explicitly allowed', () => {
  const report = inspectZipBuffer(zip([], { trailingBytes: 'x' }), { rejectPolyglot: false });
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('prepended self-extracting bytes are rejected by default', () => {
  const report = inspectZipBuffer(zip([{ name: 'x.txt', data: 'x' }], { prependBytes: 'MZ' }));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.POLYGLOT), true);
});

test('prepended self-extracting bytes can be inspected when explicitly allowed', () => {
  const report = inspectZipBuffer(zip([{ name: 'x.txt', data: 'x' }], { prependBytes: 'MZ' }), { rejectPolyglot: false });
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('truncated EOCD is malformed', () => {
  const archive = zip([]);
  const report = inspectZipBuffer(archive.subarray(0, archive.length - 1));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.TRUNCATED), true);
});

test('multi-disk archive disk number is rejected', () => {
  const archive = zip([]);
  const mutated = patchUInt16(archive, findEocd(archive) + 4, 1);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MULTI_DISK), true);
});

test('multi-disk central directory disk is rejected', () => {
  const archive = zip([]);
  const mutated = patchUInt16(archive, findEocd(archive) + 6, 1);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MULTI_DISK), true);
});

test('mismatched disk entry count is rejected', () => {
  const archive = zip([{ name: 'x', data: 'x' }]);
  const mutated = patchUInt16(archive, findEocd(archive) + 8, 0);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MULTI_DISK), true);
});

test('nonzero central entry disk number is rejected', () => {
  const archive = zip([{ name: 'x', data: 'x' }]);
  const cd = centralDirectoryOffset(archive);
  const mutated = patchUInt16(archive, cd + 34, 1);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MULTI_DISK), true);
});

test('ZIP64 entry-count sentinel is rejected', () => {
  const archive = zip([]);
  const mutated = patchUInt16(archive, findEocd(archive) + 10, 0xffff);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.UNSUPPORTED_ZIP64), true);
});

test('ZIP64 central-size sentinel is rejected', () => {
  const archive = zip([]);
  const mutated = patchUInt32(archive, findEocd(archive) + 12, 0xffffffff);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.UNSUPPORTED_ZIP64), true);
});

test('ZIP64 central-offset sentinel is rejected', () => {
  const archive = zip([]);
  const mutated = patchUInt32(archive, findEocd(archive) + 16, 0xffffffff);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.UNSUPPORTED_ZIP64), true);
});

test('ZIP64 central extra field is rejected', () => {
  const report = single([{ name: 'x', data: 'x', centralExtra: Buffer.from([1, 0, 0, 0]) }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.UNSUPPORTED_ZIP64), true);
});

test('ZIP64 local extra field is rejected', () => {
  const report = single([{ name: 'x', data: 'x', localExtra: Buffer.from([1, 0, 0, 0]) }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.UNSUPPORTED_ZIP64), true);
});

test('malformed central extra field is rejected', () => {
  const report = single([{ name: 'x', data: 'x', centralExtra: Buffer.from([2, 0, 5, 0, 1]) }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MALFORMED_ZIP), true);
});

test('malformed local extra field is rejected', () => {
  const report = single([{ name: 'x', data: 'x', localExtra: Buffer.from([2, 0, 5, 0, 1]) }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MALFORMED_ZIP), true);
});

test('central directory offset beyond EOCD is truncated', () => {
  const archive = zip([]);
  const mutated = patchUInt32(archive, findEocd(archive) + 16, 5000);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.TRUNCATED), true);
});

test('central directory size mismatch is rejected', () => {
  const archive = zip([{ name: 'x', data: 'x' }]);
  const eocd = findEocd(archive);
  const size = archive.readUInt32LE(eocd + 12);
  const mutated = patchUInt32(archive, eocd + 12, size - 1);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MALFORMED_ZIP), true);
});

test('central directory signature mismatch is rejected', () => {
  const archive = zip([{ name: 'x', data: 'x' }]);
  const mutated = patchByte(archive, centralDirectoryOffset(archive), 0);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MALFORMED_ZIP), true);
});

test('central entry count mismatch is rejected', () => {
  const archive = zip([{ name: 'x', data: 'x' }]);
  const mutated = patchUInt16(archive, findEocd(archive) + 10, 2);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MALFORMED_ZIP), true);
});

test('local header signature mismatch is rejected', () => {
  const archive = zip([{ name: 'x', data: 'x' }]);
  const mutated = patchByte(archive, 0, 0);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('local and central filename mismatch is rejected as parser differential', () => {
  const report = single([{ name: 'safe.txt', data: 'x', localNameBytes: 'evil.txt' }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('local and central method mismatch is rejected as parser differential', () => {
  const report = single([{ name: 'x', data: 'x', method: 'deflate', localMethod: 0 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('local and central flags mismatch is rejected as parser differential', () => {
  const report = single([{ name: 'x', data: 'x', localFlags: 0 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('local and central CRC mismatch is rejected without a data descriptor', () => {
  const report = single([{ name: 'x', data: 'x', localCrc32: 0 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('local and central compressed-size mismatch is rejected without a data descriptor', () => {
  const report = single([{ name: 'x', data: 'abc', localCompressedSize: 99 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('local and central uncompressed-size mismatch is rejected without a data descriptor', () => {
  const report = single([{ name: 'x', data: 'abc', localUncompressedSize: 99 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('local size placeholders are permitted only when a data descriptor is in use', () => {
  const report = single([{ name: 'x', data: 'abc', method: 'deflate', dataDescriptor: true }]);
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('conflicting nonzero local sizes are rejected even when a data descriptor is in use', () => {
  const report = single([{ name: 'x', data: 'abc', method: 'deflate', dataDescriptor: true, localCompressedSize: 99 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('matching nonzero local sizes are accepted when a data descriptor is in use', () => {
  const data = 'abc';
  const compressed = deflate(data);
  const report = single([{
    name: 'x',
    data,
    method: 'deflate',
    dataDescriptor: true,
    localCrc32: crc32(data),
    localCompressedSize: compressed.length,
    localUncompressedSize: data.length
  }]);
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('corrupt data descriptor CRC is rejected', () => {
  const archive = zip([{ name: 'x', data: 'abc', method: 'deflate', dataDescriptor: true }]);
  const before = inspectZipBuffer(archive);
  const start = before.entries[0].dataEnd;
  const mutated = patchUInt32(archive, start + 4, before.entries[0].crc32 ^ 1);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('corrupt data descriptor compressed size is rejected', () => {
  const archive = zip([{ name: 'x', data: 'abc', method: 'deflate', dataDescriptor: true }]);
  const before = inspectZipBuffer(archive);
  const start = before.entries[0].dataEnd;
  const mutated = patchUInt32(archive, start + 8, before.entries[0].compressedSize + 1);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('corrupt data descriptor uncompressed size is rejected', () => {
  const archive = zip([{ name: 'x', data: 'abc', method: 'deflate', dataDescriptor: true }]);
  const before = inspectZipBuffer(archive);
  const start = before.entries[0].dataEnd;
  const mutated = patchUInt32(archive, start + 12, before.entries[0].uncompressedSize + 1);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.HEADER_MISMATCH), true);
});

test('directory entries carrying file data are rejected as parser differentials', () => {
  const report = single([{ name: 'dir/', data: 'hidden', directory: true }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MALFORMED_ZIP), true);
});

test('encrypted entries are rejected by default', () => {
  const report = single([{ name: 'x', data: 'secret', flags: 1 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.ENCRYPTED), true);
});

test('encrypted entries can be inspected with an explicit option', () => {
  const report = single([{ name: 'x', data: 'secret', flags: 1 }], { allowEncrypted: true });
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('encrypted entries still cannot be read', async () => {
  const archive = zip([{ name: 'x', data: 'secret', flags: 1 }]);
  await assert.rejects(readZipEntry(archive, 'x', { allowEncrypted: true }), (error) => {
    assert.equal(error.code, CODE.ENCRYPTED);
    return true;
  });
});

for (const bit of [0x10, 0x20, 0x40, 0x80, 0x100, 0x200, 0x400, 0x1000, 0x2000, 0x4000, 0x8000]) {
  test('unsupported general-purpose flag bit rejected: 0x' + bit.toString(16), () => {
    const report = single([{ name: 'x', data: 'x', flags: 0x800 | bit }]);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.UNSUPPORTED_FLAGS), true);
  });
}

for (const bit of [0x2, 0x4]) {
  test('undefined stored-entry compression flag bit rejected: 0x' + bit.toString(16), () => {
    const report = single([{ name: 'x', data: 'x', method: 'stored', flags: 0x800 | bit }]);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.UNSUPPORTED_FLAGS), true);
  });
}

test('deflate compression-option flag bits are accepted', () => {
  const report = single([{ name: 'x', data: 'x', method: 'deflate', flags: 0x802 }]);
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('unsupported compression method is rejected', () => {
  const report = single([{ name: 'x', data: 'x', centralMethod: 99, localMethod: 99 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.UNSUPPORTED_METHOD), true);
});

test('invalid UTF-8 filename bytes are rejected when UTF-8 flag is set', () => {
  const report = single([{ nameBytes: Buffer.from([0xff]), data: 'x' }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.INVALID_ENCODING), true);
});

test('high-bit CP437 filename bytes are decoded when UTF-8 flag is clear', () => {
  const report = single([{ nameBytes: Buffer.from([0x80]), data: 'x', utf8: false }]);
  assert.equal(report.entries[0].name, '\u00c7');
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

const specialTypes = [
  ['symlink', 0o120777, CODE.SYMLINK],
  ['fifo', 0o010644, CODE.SPECIAL_FILE],
  ['socket', 0o140644, CODE.SPECIAL_FILE],
  ['block device', 0o060644, CODE.SPECIAL_FILE],
  ['character device', 0o020644, CODE.SPECIAL_FILE],
  ['unknown special type', 0o030000, CODE.SPECIAL_FILE]
];
for (const [label, unixMode, code] of specialTypes) {
  test('Unix special entry rejected: ' + label, () => {
    const report = single([{ name: 'special', data: 'x', unixMode }]);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, code), true);
  });
}

test('symlink inspection can be explicitly allowed', () => {
  const report = single([{ name: 'link', data: 'target', unixMode: 0o120777 }], { allowSymlinks: true });
  assert.equal(report.safe, true, JSON.stringify(report.findings));
  assert.equal(report.entries[0].unixFileType, 'symlink');
});

test('special-file inspection can be explicitly allowed', () => {
  const report = single([{ name: 'fifo', data: '', unixMode: 0o010644 }], { allowSpecialFiles: true });
  assert.equal(report.safe, true, JSON.stringify(report.findings));
  assert.equal(report.entries[0].unixFileType, 'fifo');
});

for (const bits of [0o4000, 0o2000, 0o6000]) {
  test('setuid or setgid bits rejected: ' + bits.toString(8), () => {
    const report = single([{ name: 'x', data: 'x', unixMode: 0o100000 | bits | 0o644 }]);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.SUID_SGID), true);
  });
}

test('setuid inspection can be explicitly allowed', () => {
  const report = single([{ name: 'x', data: 'x', unixMode: 0o104644 }], { allowSuidSgid: true });
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('high-ratio deflate zip-bomb is rejected by ratio', () => {
  const report = single([{ name: 'bomb', data: Buffer.alloc(100000), method: 'deflate' }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.RATIO_LIMIT), true);
});

test('high-ratio archive can be inspected with explicit unlimited ratio', () => {
  const report = single([{ name: 'large', data: Buffer.alloc(100000), method: 'deflate' }], { maxCompressionRatio: Infinity });
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('zero compressed bytes claiming nonzero output is rejected', () => {
  const report = single([{ name: 'x', data: '', compressedSize: 0, uncompressedSize: 1, crc32: 0 }]);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.RATIO_LIMIT), true);
});

test('per-entry uncompressed size cap is enforced', () => {
  const report = single([{ name: 'x', data: '123456' }], { maxEntryUncompressedBytes: 5 });
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.SIZE_LIMIT), true);
});

test('aggregate uncompressed size cap is enforced', () => {
  const report = inspectZipBuffer(zip([
    { name: 'a', data: '12345' },
    { name: 'b', data: '12345' }
  ]), { maxTotalUncompressedBytes: 9 });
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.SIZE_LIMIT), true);
});

test('entry count cap is enforced', () => {
  const report = inspectZipBuffer(zip([
    { name: 'a', data: '' },
    { name: 'b', data: '' }
  ]), { maxEntries: 1 });
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.ENTRY_LIMIT), true);
});

test('archive byte cap is enforced', () => {
  const archive = zip([{ name: 'x', data: 'x' }]);
  const report = inspectZipBuffer(archive, { maxArchiveBytes: archive.length - 1 });
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.SIZE_LIMIT), true);
});

test('overlapping compressed ranges from aliased central entries are rejected', () => {
  const first = { name: 'first.txt', data: 'shared compressed payload', method: 'deflate' };
  const archive = zip([
    first,
    { name: 'second.txt', data: 'shared compressed payload', method: 'deflate', writeLocal: false, centralLocalHeaderOffset: 0 }
  ]);
  const report = inspectZipBuffer(archive);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.OVERLAPPING_DATA), true);
});

test('compressed data overlapping the next local header is rejected even without data-range overlap', () => {
  const archive = zip([
    { name: 'a', data: 'x' },
    { name: 'b', data: 'y' }
  ]);
  const cd = centralDirectoryOffset(archive);
  let mutated = patchUInt32(archive, 18, 6);
  mutated = patchUInt32(mutated, 22, 6);
  mutated = patchUInt32(mutated, cd + 20, 6);
  mutated = patchUInt32(mutated, cd + 24, 6);
  const report = inspectZipBuffer(mutated);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.MALFORMED_ZIP), true);
  assert.equal(hasFinding(report, CODE.OVERLAPPING_DATA), false);
});

function archiveWithInteriorGap() {
  const archive = zip([
    { name: 'a', data: 'x' },
    { name: 'b', data: 'y' }
  ]);
  const secondLocalOffset = 32;
  const originalCentralOffset = centralDirectoryOffset(archive);
  const gap = Buffer.from('GAP');
  const mutated = Buffer.concat([
    archive.subarray(0, secondLocalOffset),
    gap,
    archive.subarray(secondLocalOffset)
  ]);
  const centralOffset = originalCentralOffset + gap.length;
  const secondCentralOffset = centralOffset + 47;
  mutated.writeUInt32LE(secondLocalOffset + gap.length, secondCentralOffset + 42);
  const eocd = findEocd(mutated);
  mutated.writeUInt32LE(centralOffset, eocd + 16);
  return mutated;
}

test('unaccounted bytes between local records are rejected as interior polyglot data', () => {
  const report = inspectZipBuffer(archiveWithInteriorGap());
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.POLYGLOT), true);
});

test('interior gaps can be inspected when polyglot rejection is disabled', () => {
  const report = inspectZipBuffer(archiveWithInteriorGap(), { rejectPolyglot: false });
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('aliased empty compressed ranges are rejected', () => {
  const archive = zip([
    { name: 'first.txt', data: '' },
    { name: 'second.txt', data: '', writeLocal: false, centralLocalHeaderOffset: 0 }
  ]);
  const report = inspectZipBuffer(archive);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.OVERLAPPING_DATA), true);
});

test('deceptive deflate stream aborts at hard byte cap even when header claims small output', async () => {
  const inflated = Buffer.alloc(2 * 1024 * 1024, 65);
  const archive = zip([{ name: 'lie.txt', data: inflated, method: 'deflate', uncompressedSize: 100 }]);
  const report = inspectZipBuffer(archive);
  assert.equal(report.safe, true, JSON.stringify(report.findings));
  await assert.rejects(readZipEntry(archive, 'lie.txt'), (error) => {
    assert.equal(error.code, CODE.SIZE_LIMIT);
    return true;
  });
});

test('decompressed size smaller than central directory is rejected', async () => {
  const archive = zip([{ name: 'x', data: 'abc', method: 'deflate', uncompressedSize: 10 }]);
  await assert.rejects(readZipEntry(archive, 'x'), (error) => {
    assert.equal(error.code, CODE.SIZE_MISMATCH);
    return true;
  });
});

test('CRC-32 mismatch after inflation is rejected', async () => {
  const archive = zip([{ name: 'x', data: 'abc', method: 'deflate', crc32: crc32('abd') }]);
  await assert.rejects(readZipEntry(archive, 'x'), (error) => {
    assert.equal(error.code, CODE.CRC_MISMATCH);
    return true;
  });
});

test('malformed deflate stream is rejected', async () => {
  const archive = zip([{ name: 'x', data: 'abc', method: 'deflate', compressedData: 'not a deflate stream' }]);
  await assert.rejects(readZipEntry(archive, 'x'), (error) => {
    assert.equal(error.code, CODE.DEFLATE_ERROR);
    return true;
  });
});

test('trailing bytes inside compressed data length are rejected', async () => {
  const compressed = Buffer.concat([deflate('abc'), Buffer.from('junk')]);
  const archive = zip([{ name: 'x', data: 'abc', method: 'deflate', compressedData: compressed }]);
  const report = inspectZipBuffer(archive);
  assert.equal(report.safe, true, JSON.stringify(report.findings));
  await assert.rejects(readZipEntry(archive, 'x'), (error) => {
    assert.equal(error.code, CODE.TRAILING_COMPRESSED_DATA);
    return true;
  });
});

test('stored entry compressed and uncompressed size mismatch is rejected during read', async () => {
  const archive = zip([{ name: 'x', data: 'abc', uncompressedSize: 4 }]);
  await assert.rejects(readZipEntry(archive, 'x'), (error) => {
    assert.equal(error.code, CODE.SIZE_MISMATCH);
    return true;
  });
});

test('stored entry CRC mismatch is rejected during read', async () => {
  const archive = zip([{ name: 'x', data: 'abc', crc32: crc32('abd') }]);
  await assert.rejects(readZipEntry(archive, 'x'), (error) => {
    assert.equal(error.code, CODE.CRC_MISMATCH);
    return true;
  });
});

test('valid stored entry reads exactly', async () => {
  const archive = zip([{ name: 'x', data: 'stored bytes' }]);
  assert.equal((await readZipEntry(archive, 'x')).toString(), 'stored bytes');
});

test('valid deflate entry reads exactly', async () => {
  const archive = zip([{ name: 'x', data: 'deflate bytes deflate bytes', method: 'deflate' }]);
  assert.equal((await readZipEntry(archive, 'x')).toString(), 'deflate bytes deflate bytes');
});

test('valid data-descriptor deflate entry reads exactly', async () => {
  const archive = zip([{ name: 'x', data: 'descriptor bytes', method: 'deflate', dataDescriptor: true }]);
  assert.equal((await readZipEntry(archive, 'x')).toString(), 'descriptor bytes');
});

test('assertSafeZipBuffer throws first finding and exposes all findings', () => {
  const archive = zip([{ name: '../x', data: 'x' }]);
  assert.throws(() => assertSafeZipBuffer(archive), (error) => {
    assert.equal(error.name, 'ZipCageError');
    assert.equal(error.code, CODE.PATH_TRAVERSAL);
    assert.ok(Array.isArray(error.findings));
    assert.ok(error.findings.length > 0);
    return true;
  });
});

test('assertSafeZipBuffer returns a safe report for a valid archive', () => {
  const archive = zip([{ name: 'x', data: 'x' }]);
  const report = assertSafeZipBuffer(archive);
  assert.equal(report.safe, true);
  assert.equal(report.entries.length, 1);
});

test('inspection report totals count files directories sizes and ratios', () => {
  const report = inspectZipBuffer(zip([
    { name: 'dir/', directory: true },
    { name: 'dir/a.txt', data: 'aaaa', method: 'deflate' },
    { name: 'b.txt', data: 'bb' }
  ]));
  assert.equal(report.safe, true, JSON.stringify(report.findings));
  assert.equal(report.totals.entries, 3);
  assert.equal(report.totals.files, 2);
  assert.equal(report.totals.directories, 1);
  assert.equal(report.totals.uncompressedBytes, 6);
  assert.equal(report.totals.archiveBytes > 0, true);
  assert.equal(report.totals.maximumEntryCompressionRatio >= 1, true);
});

test('maximum entry compression ratio reflects ratios below one honestly', () => {
  const report = inspectZipBuffer(zip([{ name: 'x', data: 'a', method: 'deflate' }]));
  assert.equal(report.safe, true, JSON.stringify(report.findings));
  assert.equal(report.totals.maximumEntryCompressionRatio < 1, true);
  assert.equal(report.totals.maximumEntryCompressionRatio, report.entries[0].compressionRatio);
});

test('inspection entries expose central and local header facts', () => {
  const report = inspectZipBuffer(zip([{ name: 'x.txt', data: 'abc', method: 'deflate' }]));
  const entry = report.entries[0];
  assert.equal(entry.name, 'x.txt');
  assert.equal(entry.compressionMethod, 8);
  assert.equal(entry.compressionMethodName, 'deflate');
  assert.equal(entry.localHeaderOffset, 0);
  assert.equal(entry.dataOffset > 0, true);
  assert.equal(entry.dataEnd > entry.dataOffset, true);
  assert.equal(entry.localCompressionMethod, 8);
  assert.equal(entry.localCrc32, entry.crc32);
});

test('finding codes are stable machine-readable strings', () => {
  const report = inspectZipBuffer(zip([{ name: '../x', data: 'x' }]));
  assert.ok(findingCodes(report).every((code) => code.startsWith('ERR_ZIPCAGE_')));
});
