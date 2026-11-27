import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectZipBuffer, CODE } from '../src/index.mjs';
import { zip, hasFinding } from './helpers.mjs';

function reportForName(name, options) {
  return inspectZipBuffer(zip([{ name, data: name.endsWith('/') ? '' : 'x', directory: name.endsWith('/') }]), options);
}

const traversalCases = [
  ['../evil.txt', 'parent prefix'],
  ['a/../evil.txt', 'inner parent'],
  ['a/../../evil.txt', 'escaping inner parent'],
  ['..', 'bare parent'],
  ['.', 'bare current'],
  ['a/./b.txt', 'inner current'],
  ['a/../b.txt', 'parent segment'],
  ['foo/../..', 'multiple parents'],
  ['a/b/../../../c', 'deep escape'],
  ['a\\b.txt', 'backslash separator'],
  ['a\\..\\b.txt', 'backslash parent'],
  ['..\\evil.txt', 'backslash parent prefix'],
  ['a/..\\evil.txt', 'mixed separator parent']
];

for (const [name, label] of traversalCases) {
  test('path traversal rejected: ' + label, () => {
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.PATH_TRAVERSAL), true);
  });
}

const absoluteCases = [
  ['/etc/passwd', 'posix absolute'],
  ['/tmp/evil', 'tmp absolute'],
  ['\\windows\\system32\\evil.dll', 'backslash absolute']
];
for (const [name, label] of absoluteCases) {
  test('absolute path rejected: ' + label, () => {
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.ABSOLUTE_PATH), true);
  });
}

const uncCases = [
  ['//server/share/evil.txt', 'slash UNC'],
  ['\\\\server\\share\\evil.txt', 'backslash UNC'],
  ['//?/C:/evil.txt', 'device namespace UNC']
];
for (const [name, label] of uncCases) {
  test('UNC path rejected: ' + label, () => {
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.UNC_PATH), true);
  });
}

const driveCases = [
  ['C:evil.txt', 'drive relative'],
  ['C:/evil.txt', 'drive slash'],
  ['C:\\evil.txt', 'drive backslash'],
  ['d:/evil.txt', 'lowercase drive'],
  ['z:evil.txt', 'late drive letter'],
  ['a/b:C.txt', 'alternate stream colon'],
  ['a/b.txt:stream', 'trailing alternate stream colon']
];
for (const [name, label] of driveCases) {
  test('drive or colon path rejected: ' + label, () => {
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.DRIVE_PATH), true);
  });
}

const controlCases = [
  ['a\0b.txt', 'NUL'],
  ['a\x01b.txt', 'C0 control'],
  ['a\x1fb.txt', 'final C0 control'],
  ['a\x7fb.txt', 'DEL'],
  ['a\u0085b.txt', 'C1 control'],
  ['a\u009fb.txt', 'final C1 control'],
  ['\n.txt', 'newline'],
  ['\r\n.txt', 'carriage return newline'],
  ['a\tb.txt', 'tab']
];
for (const [name, label] of controlCases) {
  test('control character rejected: ' + label, () => {
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.CONTROL_CHARACTER), true);
  });
}

const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM9', 'LPT1', 'LPT2', 'LPT9'];
for (const device of reservedNames) {
  test('Windows reserved device rejected: ' + device, () => {
    const report = reportForName('a/' + device);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.RESERVED_NAME), true);
  });
  test('Windows reserved device with extension rejected: ' + device, () => {
    const report = reportForName('a/' + device.toLowerCase() + '.txt');
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.RESERVED_NAME), true);
  });
}

for (const name of ['CON .txt', 'NUL .txt', 'com1 .txt', 'lpt2 .txt']) {
  test('Windows reserved device with padded basename rejected: ' + name, () => {
    const report = reportForName('a/' + name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.RESERVED_NAME), true);
  });
}

const trailingCases = [
  ['a.', 'file trailing dot'],
  ['a ', 'file trailing space'],
  ['dir./file.txt', 'directory trailing dot'],
  ['dir /file.txt', 'directory trailing space'],
  ['...', 'only dots'],
  ['a/... /b', 'nested dots and space']
];
for (const [name, label] of trailingCases) {
  test('Windows trailing dot or space rejected: ' + label, () => {
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.TRAILING_DOT_OR_SPACE), true);
  });
}

const emptySegmentCases = [
  ['a//b.txt', 'double slash'],
  ['a///b.txt', 'triple slash'],
  ['a//', 'directory double slash'],
  ['//', 'only slashes']
];
for (const [name, label] of emptySegmentCases) {
  test('empty path segment rejected: ' + label, () => {
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.EMPTY_PATH_SEGMENT), true);
  });
}

const prototypeCases = [
  ['__proto__', 'proto dunder'],
  ['constructor', 'constructor'],
  ['prototype', 'prototype'],
  ['a/__proto__/b.txt', 'nested proto dunder'],
  ['a/Constructor/b.txt', 'mixed case constructor']
];
for (const [name, label] of prototypeCases) {
  test('prototype-polluting segment rejected: ' + label, () => {
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.PROTOTYPE_POLLUTION), true);
  });
  test('prototype-polluting segment can be allowed explicitly: ' + label, () => {
    const report = reportForName(name, { allowPrototypePollutingNames: true });
    assert.equal(hasFinding(report, CODE.PROTOTYPE_POLLUTION), false);
  });
}

test('empty filename is rejected', () => {
  const report = inspectZipBuffer(zip([{ name: '', data: 'x' }]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.EMPTY_PATH), true);
});

test('slash-only filename is rejected as empty', () => {
  const report = inspectZipBuffer(zip([{ name: '/', data: 'x' }]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.EMPTY_PATH), true);
});

for (let depth = 1; depth <= 20; depth += 1) {
  test('valid path accepted at depth ' + depth, () => {
    const segments = Array.from({ length: depth - 1 }, (_, index) => 'd' + index);
    segments.push('file.txt');
    const name = segments.join('/');
    const report = reportForName(name);
    assert.equal(report.safe, true, JSON.stringify(report.findings));
  });
}

for (let depth = 21; depth <= 25; depth += 1) {
  test('path rejected beyond default depth at depth ' + depth, () => {
    const name = Array.from({ length: depth }, (_, index) => 'd' + index).join('/');
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.PATH_TOO_DEEP), true);
  });
}

test('depth limit is configurable upward', () => {
  const name = Array.from({ length: 25 }, (_, index) => 'd' + index).join('/');
  const report = reportForName(name, { maxDepth: 25 });
  assert.equal(hasFinding(report, CODE.PATH_TOO_DEEP), false);
});

test('depth limit is configurable downward', () => {
  const report = reportForName('a/b.txt', { maxDepth: 1 });
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.PATH_TOO_DEEP), true);
});

for (const length of [510, 511, 512]) {
  test('path accepted at byte length ' + length, () => {
    const name = 'a'.repeat(length);
    const report = reportForName(name);
    assert.equal(report.safe, true, JSON.stringify(report.findings));
  });
}

for (const length of [513, 600]) {
  test('path rejected at byte length ' + length, () => {
    const name = 'a'.repeat(length);
    const report = reportForName(name);
    assert.equal(report.safe, false);
    assert.equal(hasFinding(report, CODE.PATH_TOO_LONG), true);
  });
}

test('path length is measured in UTF-8 bytes', () => {
  const name = 'é'.repeat(256) + 'a';
  assert.equal(Buffer.byteLength(name, 'utf8'), 513);
  const report = reportForName(name);
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.PATH_TOO_LONG), true);
});

test('path length limit is configurable', () => {
  const report = reportForName('abcdef', { maxPathLength: 5 });
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.PATH_TOO_LONG), true);
});

const validNames = [
  'hello.txt',
  'a/b/c.txt',
  'unicode-é-文件.txt',
  'space inside.txt',
  'CONSOLE.txt',
  'com0.txt',
  'com10.txt',
  'lpt0.txt',
  'lpt10.txt',
  'constructor.txt',
  'prototype.txt',
  '__proto__.txt',
  '.hidden',
  '.well-known/file.txt',
  'a-.-/file.txt',
  'x..y',
  'x  y.txt',
  '100%.txt',
  'at@example.txt',
  'plus+equal=semi;.txt',
  'dir/',
  'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/file.txt'
];
for (const name of validNames) {
  test('valid filename accepted: ' + name, () => {
    const report = reportForName(name);
    assert.equal(report.safe, true, JSON.stringify(report.findings));
    assert.equal(report.entries[0].normalizedName, name.endsWith('/') ? name.slice(0, -1) : name);
  });
}

test('duplicate normalized exact paths are rejected', () => {
  const report = inspectZipBuffer(zip([
    { name: 'same.txt', data: 'one' },
    { name: 'same.txt', data: 'two' }
  ]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.DUPLICATE_PATH), true);
});

test('case-only duplicate paths are rejected by default', () => {
  const report = inspectZipBuffer(zip([
    { name: 'ReadMe.txt', data: 'one' },
    { name: 'readme.txt', data: 'two' }
  ]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.DUPLICATE_PATH), true);
});

test('case-only duplicates can be allowed explicitly for inspection', () => {
  const report = inspectZipBuffer(zip([
    { name: 'ReadMe.txt', data: 'one' },
    { name: 'readme.txt', data: 'two' }
  ]), { caseInsensitiveDuplicates: false });
  assert.equal(hasFinding(report, CODE.DUPLICATE_PATH), false);
});

test('Unicode normalization duplicate paths are rejected', () => {
  const report = inspectZipBuffer(zip([
    { name: 'café.txt', data: 'one' },
    { name: 'cafe\u0301.txt', data: 'two' }
  ]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.DUPLICATE_PATH), true);
});

test('file and explicit directory at one path collide', () => {
  const report = inspectZipBuffer(zip([
    { name: 'foo', data: 'file' },
    { name: 'foo/', data: '', directory: true }
  ]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.FILE_DIRECTORY_COLLISION), true);
});

test('file blocks a child path in the archive', () => {
  const report = inspectZipBuffer(zip([
    { name: 'foo', data: 'file' },
    { name: 'foo/bar.txt', data: 'child' }
  ]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.FILE_DIRECTORY_COLLISION), true);
});

test('file blocks an explicit child directory in the archive', () => {
  const report = inspectZipBuffer(zip([
    { name: 'foo', data: 'file' },
    { name: 'foo/bar/', data: '', directory: true }
  ]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.FILE_DIRECTORY_COLLISION), true);
});

test('case-insensitive file blocks an explicit child directory in the archive', () => {
  const report = inspectZipBuffer(zip([
    { name: 'Foo', data: 'file' },
    { name: 'foo/bar/', data: '', directory: true }
  ]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.FILE_DIRECTORY_COLLISION), true);
});

test('explicit directory does not collide with its child', () => {
  const report = inspectZipBuffer(zip([
    { name: 'foo/', data: '', directory: true },
    { name: 'foo/bar.txt', data: 'child' }
  ]));
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('sibling files below one implicit directory do not collide', () => {
  const report = inspectZipBuffer(zip([
    { name: 'foo/a.txt', data: 'a' },
    { name: 'foo/b.txt', data: 'b' }
  ]));
  assert.equal(report.safe, true, JSON.stringify(report.findings));
});

test('case-insensitive file-directory collision is rejected', () => {
  const report = inspectZipBuffer(zip([
    { name: 'Foo', data: 'file' },
    { name: 'foo/bar.txt', data: 'child' }
  ]));
  assert.equal(report.safe, false);
  assert.equal(hasFinding(report, CODE.FILE_DIRECTORY_COLLISION), true);
});
