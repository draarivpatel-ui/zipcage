import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXPECTED_TEST_COUNT = 442;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_ENTRIES = new Set(['.git', 'node_modules', '.DS_Store']);

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (SKIP_ENTRIES.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...await walk(full));
    } else if (entry.isFile() && !entry.name.endsWith('.tgz')) {
      output.push(full);
    }
  }
  return output.sort();
}

async function trackedTextFiles() {
  const files = await walk(root);
  return files.filter((file) => !file.endsWith('.png') && !file.endsWith('.jpg'));
}

test('repository text files contain no em or en dash characters', async () => {
  const emDash = String.fromCharCode(0x2014);
  const enDash = String.fromCharCode(0x2013);
  for (const file of await trackedTextFiles()) {
    const text = await readFile(file, 'utf8');
    assert.equal(text.includes(emDash), false, file + ' contains an em dash');
    assert.equal(text.includes(enDash), false, file + ' contains an en dash');
  }
});

test('repository text files contain no local paths or private account data', async () => {
  const banned = [
    new RegExp('/' + 'Users' + '/'),
    new RegExp('Hub' + '/' + 'personal'),
    new RegExp('Contest' + ' ' + 'Submissions'),
    new RegExp('@' + 'gmail'),
    new RegExp('t3' + '-code', 'i'),
    new RegExp('pro' + 'ro' + 'blox', 'i')
  ];
  for (const file of await trackedTextFiles()) {
    const raw = await readFile(file, 'utf8');
    const text = raw
      .replaceAll('287273626+draarivpatel-ui@users.noreply.github.com', '')
      .replaceAll('draarivpatel-ui', '');
    for (const pattern of banned) {
      assert.equal(pattern.test(text), false, file + ' contains ' + pattern);
    }
    assert.equal(new RegExp('aa' + 'riv' + 'patel', 'i').test(text), false, file + ' contains a private account string');
  }
});

test('repository text files use LF line endings', async () => {
  for (const file of await trackedTextFiles()) {
    const text = await readFile(file, 'utf8');
    assert.equal(text.includes('\r'), false, file + ' contains CR');
  }
});

test('repository files contain no secret-shaped placeholders with vendor prefixes', async () => {
  const patterns = [
    new RegExp('ts' + 'key-'),
    new RegExp('s' + 'k-[A-Za-z0-9]'),
    new RegExp('gh' + 'p_[A-Za-z0-9]'),
    new RegExp('github' + '_pat_[A-Za-z0-9]'),
    new RegExp('AK' + 'IA[0-9A-Z]'),
    new RegExp('x' + 'ox[baprs]-'),
    new RegExp('nv' + 'api-'),
    new RegExp('AI' + 'za[0-9A-Za-z_-]')
  ];
  for (const file of await trackedTextFiles()) {
    const text = await readFile(file, 'utf8');
    for (const pattern of patterns) {
      assert.equal(pattern.test(text), false, file + ' contains ' + pattern);
    }
  }
});

test('README deterministic test count matches the verified live count', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const match = readme.match(/\b(\d+) deterministic tests\b/i);
  assert.ok(match, 'README does not state the deterministic test count');
  assert.equal(Number(match[1]), EXPECTED_TEST_COUNT);
});

test('README states limitations and supported Node versions', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /Node 18 or newer/i);
  assert.match(readme, /Limitations/i);
  assert.match(readme, /ZIP64 is intentionally unsupported/i);
  assert.match(readme, /stored method 0 and deflate method 8/i);
});

test('README documents the major attack classes without hype', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  for (const fragment of ['CWE-22', 'CWE-409', 'symlink', 'overlapping compressed', 'parser differentials']) {
    assert.ok(readme.includes(fragment), 'missing README fragment ' + fragment);
  }
  assert.equal(/guaranteed|military grade|unbreakable/i.test(readme), false);
});

test('security documentation includes a reporting channel and scope', async () => {
  const security = await readFile(path.join(root, 'SECURITY.md'), 'utf8');
  assert.match(security, /Report suspected vulnerabilities privately/i);
  assert.match(security, /Supported versions/i);
  assert.match(security, /CWE-22/);
  assert.match(security, /CWE-409/);
  assert.match(security, /Out of scope/i);
});

test('contributing documentation preserves zero-dependency fail-closed rules', async () => {
  const text = await readFile(path.join(root, 'CONTRIBUTING.md'), 'utf8');
  assert.match(text, /zero-dependency/);
  assert.match(text, /fail-closed/);
  assert.match(text, /node scripts\/build-cjs\.mjs/);
  assert.match(text, /Node 18, 20, 22 and 24/);
});

test('good first issues file contains ten starter ideas', async () => {
  const text = await readFile(path.join(root, 'GOOD_FIRST_ISSUES.md'), 'utf8');
  const count = (text.match(/^## \d+\./gm) || []).length;
  assert.equal(count, 10);
});

test('good first issues includes ZIP64 support as a starter design task', async () => {
  const text = await readFile(path.join(root, 'GOOD_FIRST_ISSUES.md'), 'utf8');
  assert.match(text, /ZIP64 support/);
});

test('license is MIT without personal data', async () => {
  const license = await readFile(path.join(root, 'LICENSE'), 'utf8');
  assert.match(license, /MIT License/);
  assert.match(license, /Permission is hereby granted/);
  assert.match(license, /zipcage contributors/);
});

test('GitHub metadata templates exist', async () => {
  for (const file of [
    ['.github', 'ISSUE_TEMPLATE', 'bug_report.md'],
    ['.github', 'ISSUE_TEMPLATE', 'feature_request.md'],
    ['.github', 'PULL_REQUEST_TEMPLATE.md'],
    ['.github', 'workflows', 'ci.yml']
  ]) {
    await access(path.join(root, ...file));
  }
});

test('bug report template requires fixture versions expected and actual results', async () => {
  const text = await readFile(path.join(root, '.github', 'ISSUE_TEMPLATE', 'bug_report.md'), 'utf8');
  for (const fragment of ['Minimal reproduction', 'Fixture and options', 'Expected result', 'Actual result', 'Node.js version']) {
    assert.ok(text.includes(fragment), 'missing bug template fragment ' + fragment);
  }
});

test('pull request template requires exact test count and security analysis', async () => {
  const text = await readFile(path.join(root, '.github', 'PULL_REQUEST_TEMPLATE.md'), 'utf8');
  assert.match(text, /Security analysis/);
  assert.match(text, /Exact final test count/);
  assert.match(text, /No dependencies were added/);
});

test('package has no lockfile or dependency directory', async () => {
  await assert.rejects(access(path.join(root, 'node_modules')));
  await assert.rejects(access(path.join(root, 'package-lock.json')));
  await assert.rejects(access(path.join(root, 'npm-shrinkwrap.json')));
});

test('package has zero runtime and development dependencies', async () => {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.dependencies, {});
  assert.deepEqual(pkg.devDependencies, {});
  assert.equal(pkg.sideEffects, false);
});

test('TypeScript declarations avoid explicit any types', async () => {
  const text = await readFile(path.join(root, 'types', 'index.d.ts'), 'utf8');
  assert.equal(/\bany\b/.test(text), false);
  assert.match(text, /readonly ZipCageFinding/);
});

test('source and generated build avoid eval and dynamic code execution', async () => {
  for (const file of [path.join(root, 'src', 'index.mjs'), path.join(root, 'cjs', 'index.cjs')]) {
    const text = await readFile(file, 'utf8');
    assert.equal(/\beval\s*\(/.test(text), false, file + ' uses eval');
    assert.equal(/new\s+Function\s*\(/.test(text), false, file + ' uses Function');
  }
});

test('repository file count stays within the intended minimal release surface', async () => {
  const files = await trackedTextFiles();
  assert.equal(files.length < 40, true, 'unexpected repository file growth: ' + files.length);
});
