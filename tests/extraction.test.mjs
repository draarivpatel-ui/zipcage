import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, readdir, rm, stat, lstat, writeFile, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extractZipBuffer, readZipEntry, CODE } from '../src/index.mjs';
import { zip, validZip } from './helpers.mjs';

async function withTempDir(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zipcage-test-'));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function makeSymlink(target, linkPath, type) {
  try {
    await symlink(target, linkPath, process.platform === 'win32' ? type : undefined);
    return true;
  } catch {
    return false;
  }
}

test('extracts stored and deflate files with exact bytes', async () => {
  await withTempDir(async (directory) => {
    const archive = validZip([
      { name: 'stored.txt', data: 'stored content' },
      { name: 'deflate.txt', data: 'deflate content deflate content', method: 'deflate' }
    ]);
    const result = await extractZipBuffer(archive, directory);
    assert.equal(result.entriesWritten, 2);
    assert.equal(result.bytesWritten, 45);
    assert.equal(await readFile(path.join(directory, 'stored.txt'), 'utf8'), 'stored content');
    assert.equal(await readFile(path.join(directory, 'deflate.txt'), 'utf8'), 'deflate content deflate content');
  });
});

test('extracts nested files and explicit directories', async () => {
  await withTempDir(async (directory) => {
    const archive = validZip([
      { name: 'a/', directory: true },
      { name: 'a/b/', directory: true },
      { name: 'a/b/c.txt', data: 'nested' }
    ]);
    const result = await extractZipBuffer(archive, directory);
    assert.equal(await readFile(path.join(directory, 'a', 'b', 'c.txt'), 'utf8'), 'nested');
    assert.equal((await stat(path.join(directory, 'a', 'b'))).isDirectory(), true);
    assert.equal(result.report.safe, true);
  });
});

test('creates implicit parent directories', async () => {
  await withTempDir(async (directory) => {
    const archive = validZip([{ name: 'one/two/three.txt', data: 'deep' }]);
    await extractZipBuffer(archive, directory);
    assert.equal(await readFile(path.join(directory, 'one', 'two', 'three.txt'), 'utf8'), 'deep');
  });
});

test('extracts empty files as zero bytes', async () => {
  await withTempDir(async (directory) => {
    const archive = validZip([{ name: 'empty.txt', data: '' }]);
    const result = await extractZipBuffer(archive, directory);
    assert.equal(result.bytesWritten, 0);
    assert.equal((await readFile(path.join(directory, 'empty.txt'))).length, 0);
  });
});

test('extracts Unicode filenames and contents', async () => {
  await withTempDir(async (directory) => {
    const archive = validZip([{ name: 'unicode-é-文件.txt', data: 'héllo 文件' }]);
    await extractZipBuffer(archive, directory);
    assert.equal(await readFile(path.join(directory, 'unicode-é-文件.txt'), 'utf8'), 'héllo 文件');
  });
});

test('returns real target path and structured extraction facts', async () => {
  await withTempDir(async (directory) => {
    const archive = validZip([{ name: 'x.txt', data: 'x' }]);
    const result = await extractZipBuffer(archive, directory);
    assert.equal(result.targetDir, await realpath(directory));
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].name, 'x.txt');
    assert.equal(result.files[0].bytes, 1);
    assert.equal(path.isAbsolute(result.files[0].path), true);
  });
});

if (process.platform !== 'win32') {
  test('regular files are written with mode 0644', async () => {
    await withTempDir(async (directory) => {
      const archive = validZip([{ name: 'x', data: 'x', unixMode: 0o100777 }]);
      await extractZipBuffer(archive, directory);
      assert.equal((await stat(path.join(directory, 'x'))).mode & 0o777, 0o644);
    });
  });

  test('created directories use mode 0755', async () => {
    await withTempDir(async (directory) => {
      const archive = validZip([{ name: 'dir/file', data: 'x' }]);
      await extractZipBuffer(archive, directory);
      assert.equal((await stat(path.join(directory, 'dir'))).mode & 0o777, 0o755);
    });
  });

  test('setuid bits are stripped even when inspection allows them', async () => {
    await withTempDir(async (directory) => {
      const archive = zip([{ name: 'x', data: 'x', unixMode: 0o104777 }]);
      await extractZipBuffer(archive, directory, { allowSuidSgid: true });
      assert.equal((await stat(path.join(directory, 'x'))).mode & 0o7777, 0o644);
    });
  });
} else {
  test('file mode check is represented on Windows', async () => {
    await withTempDir(async (directory) => {
      const archive = validZip([{ name: 'x', data: 'x' }]);
      await extractZipBuffer(archive, directory);
      assert.equal((await stat(path.join(directory, 'x'))).isFile(), true);
    });
  });
  test('directory creation check is represented on Windows', async () => {
    await withTempDir(async (directory) => {
      const archive = validZip([{ name: 'dir/file', data: 'x' }]);
      await extractZipBuffer(archive, directory);
      assert.equal((await stat(path.join(directory, 'dir'))).isDirectory(), true);
    });
  });
  test('special permission bits do not create special files on Windows', async () => {
    await withTempDir(async (directory) => {
      const archive = zip([{ name: 'x', data: 'x', unixMode: 0o104777 }]);
      await extractZipBuffer(archive, directory, { allowSuidSgid: true });
      assert.equal((await stat(path.join(directory, 'x'))).isFile(), true);
    });
  });
}

test('existing destination is not overwritten by default', async () => {
  await withTempDir(async (directory) => {
    await writeFile(path.join(directory, 'x.txt'), 'original');
    const archive = validZip([{ name: 'x.txt', data: 'replacement' }]);
    await assert.rejects(extractZipBuffer(archive, directory), (error) => {
      assert.equal(error.code, CODE.EXTRACTION_OVERWRITE);
      return true;
    });
    assert.equal(await readFile(path.join(directory, 'x.txt'), 'utf8'), 'original');
  });
});

test('existing regular file can be overwritten explicitly', async () => {
  await withTempDir(async (directory) => {
    await writeFile(path.join(directory, 'x.txt'), 'original');
    const archive = validZip([{ name: 'x.txt', data: 'replacement' }]);
    await extractZipBuffer(archive, directory, { overwrite: true });
    assert.equal(await readFile(path.join(directory, 'x.txt'), 'utf8'), 'replacement');
  });
});

test('existing directory at a file path is rejected', async () => {
  await withTempDir(async (directory) => {
    await mkdir(path.join(directory, 'x.txt'));
    const archive = validZip([{ name: 'x.txt', data: 'x' }]);
    await assert.rejects(extractZipBuffer(archive, directory), (error) => {
      assert.equal(error.code, CODE.EXTRACTION_COLLISION);
      return true;
    });
  });
});

test('existing file blocking a required parent directory is rejected', async () => {
  await withTempDir(async (directory) => {
    await writeFile(path.join(directory, 'blocked'), 'file');
    const archive = validZip([{ name: 'blocked/child.txt', data: 'x' }]);
    await assert.rejects(extractZipBuffer(archive, directory), (error) => {
      assert.equal(error.code, CODE.EXTRACTION_COLLISION);
      return true;
    });
  });
});

test('archive-internal file-directory collision is never extracted', async () => {
  await withTempDir(async (directory) => {
    const archive = zip([
      { name: 'foo', data: 'file' },
      { name: 'foo/bar', data: 'child' }
    ]);
    await assert.rejects(extractZipBuffer(archive, directory), (error) => {
      assert.equal(error.code, CODE.FILE_DIRECTORY_COLLISION);
      return true;
    });
  });
});

test('symlink destination is never overwritten', async () => {
  await withTempDir(async (directory) => {
    const outside = path.join(directory, 'outside.txt');
    await writeFile(outside, 'outside');
    const created = await makeSymlink(outside, path.join(directory, 'link.txt'), 'file');
    if (!created) {
      assert.equal(await readFile(outside, 'utf8'), 'outside');
      return;
    }
    const archive = validZip([{ name: 'link.txt', data: 'replacement' }]);
    await assert.rejects(extractZipBuffer(archive, directory, { overwrite: true }), (error) => {
      assert.equal(error.code, CODE.EXTRACTION_SYMLINK);
      return true;
    });
    assert.equal(await readFile(outside, 'utf8'), 'outside');
    assert.equal((await lstat(path.join(directory, 'link.txt'))).isSymbolicLink(), true);
  });
});

test('symlink parent directory is never traversed', async () => {
  await withTempDir(async (directory) => {
    const outside = path.join(directory, 'outside');
    await mkdir(outside);
    const created = await makeSymlink(outside, path.join(directory, 'linkdir'), 'junction');
    if (!created) {
      assert.equal((await stat(outside)).isDirectory(), true);
      return;
    }
    const archive = validZip([{ name: 'linkdir/evil.txt', data: 'evil' }]);
    await assert.rejects(extractZipBuffer(archive, directory), (error) => {
      assert.equal(error.code, CODE.EXTRACTION_SYMLINK);
      return true;
    });
    assert.deepEqual(await readdir(outside), []);
  });
});

test('archive symlink entries are refused even when inspection allows them', async () => {
  await withTempDir(async (directory) => {
    const archive = zip([{ name: 'link', data: 'target', unixMode: 0o120777 }]);
    await assert.rejects(extractZipBuffer(archive, directory, { allowSymlinks: true }), (error) => {
      assert.equal(error.code, CODE.EXTRACTION_REFUSED);
      return true;
    });
    assert.deepEqual(await readdir(directory), []);
  });
});

for (const [label, unixMode] of [
  ['fifo', 0o010644],
  ['socket', 0o140644],
  ['block device', 0o060644],
  ['character device', 0o020644]
]) {
  test('archive special file is refused during extraction: ' + label, async () => {
    await withTempDir(async (directory) => {
      const archive = zip([{ name: label.replaceAll(' ', '-'), data: '', unixMode }]);
      await assert.rejects(extractZipBuffer(archive, directory, { allowSpecialFiles: true }), (error) => {
        assert.equal(error.code, CODE.EXTRACTION_REFUSED);
        return true;
      });
    });
  });
}

test('zip-slip archive is never extracted', async () => {
  await withTempDir(async (directory) => {
    const archive = zip([{ name: '../evil.txt', data: 'evil' }]);
    await assert.rejects(extractZipBuffer(archive, directory), (error) => {
      assert.equal(error.code, CODE.PATH_TRAVERSAL);
      return true;
    });
    assert.deepEqual(await readdir(directory), []);
  });
});

test('archive failing CRC verification leaves no temporary files', async () => {
  await withTempDir(async (directory) => {
    const archive = zip([{ name: 'x.txt', data: 'abc', crc32: 0 }]);
    await assert.rejects(extractZipBuffer(archive, directory), (error) => {
      assert.equal(error.code, CODE.CRC_MISMATCH);
      return true;
    });
    assert.deepEqual((await readdir(directory)).filter((name) => name.startsWith('.zipcage-')), []);
  });
});

test('failed overwrite refusal leaves no temporary files', async () => {
  await withTempDir(async (directory) => {
    await writeFile(path.join(directory, 'x.txt'), 'original');
    const archive = validZip([{ name: 'x.txt', data: 'replacement' }]);
    await assert.rejects(extractZipBuffer(archive, directory));
    assert.deepEqual((await readdir(directory)).filter((name) => name.startsWith('.zipcage-')), []);
  });
});

test('nonexistent target directory is rejected', async () => {
  await withTempDir(async (directory) => {
    const missing = path.join(directory, 'missing');
    const archive = validZip([{ name: 'x', data: 'x' }]);
    await assert.rejects(extractZipBuffer(archive, missing), (error) => {
      assert.equal(error.code, CODE.EXTRACTION_FAILED);
      return true;
    });
  });
});

test('file target directory is rejected', async () => {
  await withTempDir(async (directory) => {
    const file = path.join(directory, 'file');
    await writeFile(file, 'x');
    const archive = validZip([{ name: 'x', data: 'x' }]);
    await assert.rejects(extractZipBuffer(archive, file), (error) => {
      assert.equal(error.code, CODE.EXTRACTION_FAILED);
      return true;
    });
  });
});

for (const badTarget of ['', 'a\0b']) {
  test('invalid target directory input is rejected: ' + JSON.stringify(badTarget), async () => {
    const archive = validZip([{ name: 'x', data: 'x' }]);
    await assert.rejects(extractZipBuffer(archive, badTarget), (error) => {
      assert.equal(error.code, CODE.INVALID_INPUT);
      return true;
    });
  });
}

test('readZipEntry rejects directory content', async () => {
  const archive = validZip([{ name: 'dir/', directory: true }]);
  await assert.rejects(readZipEntry(archive, 'dir'), (error) => {
    assert.equal(error.code, CODE.INVALID_INPUT);
    return true;
  });
});

test('readZipEntry rejects symlink content even when inspection allows it', async () => {
  const archive = zip([{ name: 'link', data: 'target', unixMode: 0o120777 }]);
  await assert.rejects(readZipEntry(archive, 'link', { allowSymlinks: true }), (error) => {
    assert.equal(error.code, CODE.EXTRACTION_REFUSED);
    return true;
  });
});

test('readZipEntry reports a missing entry', async () => {
  const archive = validZip([{ name: 'x', data: 'x' }]);
  await assert.rejects(readZipEntry(archive, 'missing'), (error) => {
    assert.equal(error.code, CODE.ENTRY_NOT_FOUND);
    return true;
  });
});

test('data descriptor archives extract exactly', async () => {
  await withTempDir(async (directory) => {
    const archive = validZip([{ name: 'x.txt', data: 'descriptor exact', method: 'deflate', dataDescriptor: true }]);
    await extractZipBuffer(archive, directory);
    assert.equal(await readFile(path.join(directory, 'x.txt'), 'utf8'), 'descriptor exact');
  });
});

test('multi-file extraction preserves central-directory order', async () => {
  await withTempDir(async (directory) => {
    const archive = validZip([
      { name: 'z.txt', data: 'z' },
      { name: 'a.txt', data: 'a' },
      { name: 'm.txt', data: 'm' }
    ]);
    const result = await extractZipBuffer(archive, directory);
    assert.deepEqual(result.files.map((file) => file.name), ['z.txt', 'a.txt', 'm.txt']);
  });
});
