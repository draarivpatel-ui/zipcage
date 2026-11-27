import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODE,
  ZipCageError,
  inspectZipBuffer,
  assertSafeZipBuffer,
  readZipEntry,
  extractZipBuffer,
  createZipBuffer,
  createZipGuard
} from '../src/index.mjs';
import { zip, validZip, hasFinding } from './helpers.mjs';

function archive() {
  return validZip([{ name: 'x.txt', data: 'abc' }]);
}

test('CODE object is frozen and exposes stable error codes', () => {
  assert.equal(Object.isFrozen(CODE), true);
  assert.equal(CODE.PATH_TRAVERSAL, 'ERR_ZIPCAGE_PATH_TRAVERSAL');
  assert.equal(CODE.OVERLAPPING_DATA, 'ERR_ZIPCAGE_OVERLAPPING_DATA');
  assert.ok(Object.values(CODE).every((code) => code.startsWith('ERR_ZIPCAGE_')));
});

test('ZipCageError exposes name code reason input and JSON shape', () => {
  const error = new ZipCageError('X_CODE', 'reason text', 'input value');
  assert.equal(error.name, 'ZipCageError');
  assert.equal(error.code, 'X_CODE');
  assert.equal(error.reason, 'reason text');
  assert.equal(error.input, 'input value');
  assert.deepEqual(error.toJSON(), {
    name: 'ZipCageError',
    code: 'X_CODE',
    reason: 'reason text',
    input: 'input value'
  });
});

test('ZipCageError preserves cause when supplied', () => {
  const cause = new Error('cause');
  const error = new ZipCageError('X', 'reason', null, cause);
  assert.equal(error.cause, cause);
});

for (const [label, input] of [
  ['Buffer', () => archive()],
  ['Uint8Array', () => new Uint8Array(archive())],
  ['ArrayBuffer', () => { const value = archive(); return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength); }],
  ['DataView', () => { const value = archive(); return new DataView(value.buffer, value.byteOffset, value.byteLength); }]
]) {
  test('inspect accepts binary input type: ' + label, () => {
    const report = inspectZipBuffer(input());
    assert.equal(report.safe, true, JSON.stringify(report.findings));
  });
}

for (const input of ['not binary', null, 42, { bytes: true }, ['x']]) {
  test('inspect rejects non-binary input: ' + Object.prototype.toString.call(input), () => {
    assert.throws(() => inspectZipBuffer(input), (error) => {
      assert.equal(error.code, CODE.INVALID_INPUT);
      return true;
    });
  });
}

for (const options of [['not-object'], 'text', 42]) {
  test('inspect rejects non-plain options object: ' + Object.prototype.toString.call(options), () => {
    assert.throws(() => inspectZipBuffer(archive(), options), (error) => {
      assert.equal(error.code, CODE.INVALID_OPTIONS);
      return true;
    });
  });
}

test('inspect accepts undefined and null options as defaults', () => {
  assert.equal(inspectZipBuffer(archive(), undefined).safe, true);
  assert.equal(inspectZipBuffer(archive(), null).safe, true);
});

test('unknown option key is rejected fail-closed', () => {
  assert.throws(() => inspectZipBuffer(archive(), { notAnOption: true }), (error) => {
    assert.equal(error.code, CODE.INVALID_OPTIONS);
    assert.match(error.reason, /unknown or reserved/);
    return true;
  });
});

for (const key of ['__proto__', 'constructor', 'prototype']) {
  test('reserved prototype-related option key is rejected: ' + key, () => {
    const options = Object.create(null);
    options[key] = true;
    assert.throws(() => inspectZipBuffer(archive(), options), (error) => {
      assert.equal(error.code, CODE.INVALID_OPTIONS);
      return true;
    });
  });
}

const integerKeys = [
  'maxEntries',
  'maxEntryUncompressedBytes',
  'maxTotalUncompressedBytes',
  'maxArchiveBytes',
  'maxDepth',
  'maxPathLength'
];
for (const key of integerKeys) {
  for (const value of [0, -1, 1.5, '10', NaN]) {
    test('integer option validation rejects ' + key + '=' + String(value), () => {
      assert.throws(() => inspectZipBuffer(archive(), { [key]: value }), (error) => {
        assert.equal(error.code, CODE.INVALID_OPTIONS);
        return true;
      });
    });
  }
  test('integer option validation accepts ' + key, () => {
    assert.equal(inspectZipBuffer(archive(), { [key]: 1000 }).safe, true);
  });
}

for (const value of [0, 0.5, -1, NaN, '100']) {
  test('ratio option validation rejects ' + String(value), () => {
    assert.throws(() => inspectZipBuffer(archive(), { maxCompressionRatio: value }), (error) => {
      assert.equal(error.code, CODE.INVALID_OPTIONS);
      return true;
    });
  });
}

for (const value of [1, 100, Infinity]) {
  test('ratio option validation accepts ' + String(value), () => {
    assert.equal(inspectZipBuffer(archive(), { maxCompressionRatio: value }).safe, true);
  });
}

const booleanKeys = [
  'allowSymlinks',
  'allowSpecialFiles',
  'allowSuidSgid',
  'allowEncrypted',
  'allowPrototypePollutingNames',
  'caseInsensitiveDuplicates',
  'rejectPolyglot',
  'overwrite'
];
for (const key of booleanKeys) {
  test('boolean option validation rejects non-boolean ' + key, () => {
    assert.throws(() => inspectZipBuffer(archive(), { [key]: 1 }), (error) => {
      assert.equal(error.code, CODE.INVALID_OPTIONS);
      return true;
    });
  });
  test('boolean option validation accepts ' + key, () => {
    assert.equal(inspectZipBuffer(archive(), { [key]: true }).safe, true);
  });
}

test('options object is not mutated during inspection', () => {
  const options = { maxEntries: 10, rejectPolyglot: true };
  const snapshot = JSON.stringify(options);
  inspectZipBuffer(archive(), options);
  assert.equal(JSON.stringify(options), snapshot);
});

test('null-prototype options object is accepted', () => {
  const options = Object.create(null);
  options.maxEntries = 10;
  assert.equal(inspectZipBuffer(archive(), options).safe, true);
});

test('report object entries findings and totals are frozen', () => {
  const report = inspectZipBuffer(archive());
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.entries), true);
  assert.equal(Object.isFrozen(report.entries[0]), true);
  assert.equal(Object.isFrozen(report.findings), true);
  assert.equal(Object.isFrozen(report.totals), true);
});

test('safe report has empty findings and correct high-level shape', () => {
  const report = inspectZipBuffer(archive());
  assert.deepEqual(Object.keys(report).sort(), ['entries', 'findings', 'safe', 'totals']);
  assert.equal(report.safe, true);
  assert.equal(report.findings.length, 0);
  assert.equal(report.entries.length, 1);
});

test('hostile report has error findings and no throw from inspect', () => {
  const report = inspectZipBuffer(zip([{ name: '../x', data: 'x' }]));
  assert.equal(report.safe, false);
  assert.equal(report.findings.length > 0, true);
  assert.equal(report.findings[0].severity, 'error');
});

test('readZipEntry accepts Buffer input and returns a Buffer', async () => {
  const output = await readZipEntry(archive(), 'x.txt');
  assert.equal(Buffer.isBuffer(output), true);
  assert.equal(output.toString(), 'abc');
});

test('readZipEntry accepts normalized entry name', async () => {
  const output = await readZipEntry(validZip([{ name: 'dir/x.txt', data: 'abc' }]), 'dir/x.txt');
  assert.equal(output.toString(), 'abc');
});

for (const value of ['', null, 3]) {
  test('readZipEntry rejects invalid entryName: ' + String(value), async () => {
    await assert.rejects(readZipEntry(archive(), value), (error) => {
      assert.equal(error.code, CODE.INVALID_INPUT);
      return true;
    });
  });
}

test('readZipEntry refuses the whole archive when one entry is hostile', async () => {
  const hostile = zip([
    { name: 'good.txt', data: 'good' },
    { name: '../evil.txt', data: 'evil' }
  ]);
  await assert.rejects(readZipEntry(hostile, 'good.txt'), (error) => {
    assert.equal(error.code, CODE.PATH_TRAVERSAL);
    return true;
  });
});

test('createZipBuffer is deterministic for identical input', () => {
  const first = validZip([
    { name: 'a.txt', data: 'a' },
    { name: 'b.txt', data: 'bbb', method: 'deflate' }
  ]);
  const second = validZip([
    { name: 'a.txt', data: 'a' },
    { name: 'b.txt', data: 'bbb', method: 'deflate' }
  ]);
  assert.deepEqual(first, second);
});

test('createZipBuffer default output passes strict inspection', () => {
  const output = createZipBuffer([{ name: 'x', data: 'x' }]);
  assert.equal(inspectZipBuffer(output).safe, true);
});

test('createZipBuffer validates hostile output by default', () => {
  assert.throws(() => createZipBuffer([{ name: '../x', data: 'x' }]), (error) => {
    assert.equal(error.code, CODE.PATH_TRAVERSAL);
    return true;
  });
});

test('createZipBuffer validate false permits adversarial fixtures', () => {
  const output = createZipBuffer([{ name: '../x', data: 'x' }], { validate: false });
  assert.equal(hasFinding(inspectZipBuffer(output), CODE.PATH_TRAVERSAL), true);
});

test('createZipBuffer accepts string binary and typed-array data', async () => {
  const output = validZip([
    { name: 'string', data: 'abc' },
    { name: 'buffer', data: Buffer.from('abc') },
    { name: 'typed', data: new Uint8Array([97, 98, 99]) }
  ]);
  assert.equal((await readZipEntry(output, 'string')).toString(), 'abc');
  assert.equal((await readZipEntry(output, 'buffer')).toString(), 'abc');
  assert.equal((await readZipEntry(output, 'typed')).toString(), 'abc');
});

test('createZipBuffer accepts ArrayBuffer data', async () => {
  const data = new TextEncoder().encode('abc').buffer;
  const output = validZip([{ name: 'x', data }]);
  assert.equal((await readZipEntry(output, 'x')).toString(), 'abc');
});

test('createZipBuffer rejects non-array entries input', () => {
  assert.throws(() => createZipBuffer('x'), (error) => {
    assert.equal(error.code, CODE.INVALID_INPUT);
    return true;
  });
});

test('createZipBuffer rejects non-object entry', () => {
  assert.throws(() => createZipBuffer(['x']), (error) => {
    assert.equal(error.code, CODE.INVALID_INPUT);
    return true;
  });
});

test('createZipBuffer rejects invalid method', () => {
  assert.throws(() => createZipBuffer([{ name: 'x', data: 'x', method: 99 }], { validate: false }), (error) => {
    assert.equal(error.code, CODE.INVALID_INPUT);
    return true;
  });
});

test('createZipBuffer method aliases store and stored are equivalent', () => {
  const one = createZipBuffer([{ name: 'x', data: 'x', method: 'store' }]);
  const two = createZipBuffer([{ name: 'x', data: 'x', method: 'stored' }]);
  assert.deepEqual(one, two);
});

test('createZipBuffer supports archive comments', () => {
  const output = validZip([], { comment: 'hello comment' });
  assert.equal(inspectZipBuffer(output).safe, true);
  assert.equal(output.subarray(-13).toString(), 'hello comment');
});

test('createZipBuffer rejects overly long archive comments', () => {
  assert.throws(() => createZipBuffer([], { comment: 'x'.repeat(65536), validate: false }), (error) => {
    assert.equal(error.code, CODE.INVALID_INPUT);
    return true;
  });
});

test('createZipBuffer rejects too many entries for classic ZIP', () => {
  assert.throws(() => createZipBuffer(new Array(65536).fill(0).map((_, index) => ({ name: 'x' + index, data: '' })), { validate: false }), (error) => {
    assert.equal(error.code, CODE.INVALID_INPUT);
    return true;
  });
});

test('createZipBuffer rejects invalid builder options type', () => {
  assert.throws(() => createZipBuffer([], 'bad'), (error) => {
    assert.equal(error.code, CODE.INVALID_INPUT);
    return true;
  });
});

test('createZipBuffer writeLocal false requires an offset override', () => {
  assert.throws(() => createZipBuffer([{ name: 'x', data: 'x', writeLocal: false }], { validate: false }), (error) => {
    assert.equal(error.code, CODE.INVALID_INPUT);
    return true;
  });
});

test('createZipBuffer supports explicit dos date fields deterministically', () => {
  const output = validZip([{ name: 'x', data: 'x', dosDate: 33, dosTime: 0 }]);
  const report = inspectZipBuffer(output);
  assert.equal(report.entries[0].dosDate, 33);
  assert.equal(report.entries[0].dosTime, 0);
});

test('createZipGuard exposes frozen guard and options', () => {
  const guard = createZipGuard({ maxEntries: 2 });
  assert.equal(Object.isFrozen(guard), true);
  assert.equal(Object.isFrozen(guard.options), true);
  assert.equal(guard.options.maxEntries, 2);
});

test('createZipGuard inspect and assertSafe work', () => {
  const guard = createZipGuard();
  const input = archive();
  assert.equal(guard.inspect(input).safe, true);
  assert.equal(guard.assertSafe(input).safe, true);
  assert.equal(guard.inspect(zip([{ name: '../x', data: 'x' }])).safe, false);
  assert.throws(() => guard.assertSafe(zip([{ name: '../x', data: 'x' }])), ZipCageError);
});

test('createZipGuard readEntry works with configured policy', async () => {
  const guard = createZipGuard({ maxCompressionRatio: 100 });
  const output = await guard.readEntry(archive(), 'x.txt');
  assert.equal(output.toString(), 'abc');
});

test('createZipGuard enforces configured entry count in overrides', () => {
  const guard = createZipGuard({ maxEntries: 1 });
  const input = validZip([
    { name: 'a', data: '' },
    { name: 'b', data: '' }
  ]);
  const report = guard.inspect(input);
  assert.equal(hasFinding(report, CODE.ENTRY_LIMIT), true);
});

test('guard overrides do not mutate the guard configuration', () => {
  const guard = createZipGuard({ maxEntries: 1 });
  const input = validZip([
    { name: 'a', data: '' },
    { name: 'b', data: '' }
  ]);
  assert.equal(guard.inspect(input, { maxEntries: 2 }).safe, true);
  assert.equal(guard.options.maxEntries, 1);
  assert.equal(guard.inspect(input).safe, false);
});

test('guard rejects invalid overrides', () => {
  const guard = createZipGuard();
  assert.throws(() => guard.inspect(archive(), { badKey: true }), (error) => {
    assert.equal(error.code, CODE.INVALID_OPTIONS);
    return true;
  });
});

test('createZipGuard validates constructor options immediately', () => {
  assert.throws(() => createZipGuard({ maxEntries: 0 }), (error) => {
    assert.equal(error.code, CODE.INVALID_OPTIONS);
    return true;
  });
});

test('extractZipBuffer refuses invalid archive before touching target directory', async () => {
  const hostile = zip([{ name: '../x', data: 'x' }]);
  await assert.rejects(extractZipBuffer(hostile, 'definitely-not-created'), (error) => {
    assert.equal(error.code, CODE.PATH_TRAVERSAL);
    return true;
  });
});

test('default export shape is complete', async () => {
  const module = await import('../src/index.mjs');
  assert.deepEqual(Object.keys(module.default).sort(), [
    'CODE',
    'ZipCageError',
    'assertSafeZipBuffer',
    'createZipBuffer',
    'createZipGuard',
    'extractZipBuffer',
    'inspectZipBuffer',
    'readZipEntry'
  ]);
});

test('public functions have expected arity and types', () => {
  assert.equal(typeof inspectZipBuffer, 'function');
  assert.equal(typeof assertSafeZipBuffer, 'function');
  assert.equal(typeof readZipEntry, 'function');
  assert.equal(typeof extractZipBuffer, 'function');
  assert.equal(typeof createZipBuffer, 'function');
  assert.equal(typeof createZipGuard, 'function');
});
