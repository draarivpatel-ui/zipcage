import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  ZipCageError,
  assertSafeZipBuffer,
  createZipBuffer,
  inspectZipBuffer
} from '../src/index.mjs';

function unsafeZip(entries) {
  return createZipBuffer(entries, { validate: false });
}

function assertUnsafeArchive(archive, label) {
  const report = inspectZipBuffer(archive);
  assert.equal(report.safe, false, label + ' was considered safe');
  assert.ok(report.findings.length > 0, label + ' produced no findings');
  assert.throws(
    () => assertSafeZipBuffer(archive),
    (error) => error instanceof ZipCageError && /^ERR_ZIPCAGE_/.test(error.code)
  );
}

const safeUnit = fc.constantFrom('a', 'b', 'x', '1', 'safe', 'file');
const safeText = fc.string({ unit: safeUnit, minLength: 0, maxLength: 10 });

test('fast-check hostile ZIP entry paths always fail closed', () => {
  fc.assert(fc.property(
    safeText,
    safeText,
    fc.constantFrom('traversal', 'absolute', 'control', 'drive', 'backslash', 'prototype'),
    (left, right, attack) => {
      let name;
      if (attack === 'traversal') name = (left === '' ? '' : left + '/') + '../' + right;
      if (attack === 'absolute') name = '/' + left + right;
      if (attack === 'control') name = left + '\0' + right;
      if (attack === 'drive') name = 'C:/' + left + right;
      if (attack === 'backslash') name = left + '\\' + right;
      if (attack === 'prototype') name = (left === '' ? '' : left + '/') + '__proto__/' + right;
      if (name === '') name = '../';
      assertUnsafeArchive(unsafeZip([{ name, data: 'x' }]), attack + ' path ' + JSON.stringify(name));
    }
  ), { seed: 0x21c01, numRuns: 180 });
});

test('fast-check arbitrary central-directory entry paths are either rejected or normalized safely', () => {
  const hostileUnit = fc.constantFrom(
    'a', 'safe', 'file.txt', '/', '\\', '..', '.', '__proto__', 'constructor', 'prototype',
    'C:', 'CON', 'NUL', '\0', '\n', 'é', ' ', '.'
  );
  const arbitraryName = fc.string({ unit: hostileUnit, minLength: 1, maxLength: 14 });
  fc.assert(fc.property(arbitraryName, (name) => {
    const report = inspectZipBuffer(unsafeZip([{ name, data: 'x' }]));
    assert.equal(typeof report.safe, 'boolean');
    assert.equal(report.entries.length, 1);
    if (!report.safe) {
      assert.ok(report.findings.length > 0);
      return;
    }
    const entry = report.entries[0];
    assert.equal(entry.name.includes('\0'), false);
    assert.equal(entry.normalizedName.startsWith('/'), false);
    assert.equal(entry.normalizedName.includes('\\'), false);
    assert.equal(/^[A-Za-z]:/.test(entry.normalizedName), false);
    for (const segment of entry.pathSegments) {
      assert.ok(segment !== '.' && segment !== '..');
      assert.ok(segment.toLowerCase() !== '__proto__' && segment.toLowerCase() !== 'constructor' && segment.toLowerCase() !== 'prototype');
    }
  }), { seed: 0x21c02, numRuns: 220 });
});

test('fast-check central-directory mutations never crash inspection or produce unsafe acceptances', () => {
  const base = createZipBuffer([{ name: 'safe.txt', data: 'abc' }]);
  const eocd = base.length - 22;
  const centralOffset = base.readUInt32LE(eocd + 16);
  const centralLength = eocd - centralOffset;
  fc.assert(fc.property(
    fc.integer({ min: 0, max: centralLength - 1 }),
    fc.integer({ min: 0, max: 255 }),
    (relativeOffset, byte) => {
      const mutated = Buffer.from(base);
      mutated[centralOffset + relativeOffset] = byte;
      const report = inspectZipBuffer(mutated);
      assert.equal(typeof report.safe, 'boolean');
      assert.equal(Array.isArray(report.findings), true);
      if (report.safe) {
        assert.equal(report.entries.length, 1);
        const entry = report.entries[0];
        assert.equal(entry.normalizedName, 'safe.txt');
        for (const segment of entry.pathSegments) {
          assert.ok(segment !== '.' && segment !== '..');
        }
      }
    }
  ), { seed: 0x21c03, numRuns: 160 });
});
