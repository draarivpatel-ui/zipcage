import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extractZipBuffer } from '../src/index.mjs';
import { validZip } from './helpers.mjs';

test('a pre-existing temporary-looking file is never deleted or reused', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zipcage-tempfile-test-'));
  try {
    const predictedName = '.zipcage-' + process.pid + '-1';
    const predictedPath = path.join(directory, predictedName);
    await writeFile(predictedPath, 'pre-existing owner data');
    const archive = validZip([{ name: 'x.txt', data: 'x' }]);
    await extractZipBuffer(archive, directory);
    assert.equal(await readFile(predictedPath, 'utf8'), 'pre-existing owner data');
    assert.equal(await readFile(path.join(directory, 'x.txt'), 'utf8'), 'x');
    assert.deepEqual((await readdir(directory)).filter((name) => name.startsWith('.zipcage-')), [predictedName]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
