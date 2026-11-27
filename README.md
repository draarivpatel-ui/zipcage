# zipcage

Zero-dependency ZIP security inspection and safe extraction for Node.js.

`zipcage` parses classic single-disk ZIP archives fail-closed before untrusted
files are read or written. It detects CWE-22 Zip-Slip path traversal, CWE-409
decompression bombs, symlink and special-file injection, overlapping compressed
data ranges, encrypted or unsupported entries, and central-directory versus
local-header parser differentials. It ships ESM, CommonJS and strict TypeScript
definitions from one audited source of truth.

- Zero runtime dependencies and zero devDependencies
- 459 deterministic tests verified live with `npm test`
- ESM and CommonJS parity tested through package self-reference
- Stored and Deflate extraction through `node:zlib.createInflateRaw`
- Hard byte-counting output caps that do not trust header sizes
- CRC-32 and exact uncompressed-size verification after decompression
- Atomic same-directory writes with safe `0644` file and `0755` directory modes
- No ZIP64, multi-disk, encryption or general-purpose compression support

## Install

```sh
npm install zipcage
```

Node 18 or newer. No install step downloads dependencies because the package
has none.

## Quick start

```js
import { inspectZipBuffer, extractZipBuffer } from 'zipcage';

const report = inspectZipBuffer(untrustedZipBytes);
if (!report.safe) {
  console.log(report.findings);
} else {
  await extractZipBuffer(untrustedZipBytes, '/path/to/existing/target');
}
```

`inspectZipBuffer` does not throw because archive bytes are hostile. It returns
a structured report. Input type errors and invalid caller configuration still
throw immediately.

## Strict assertion

```js
import { assertSafeZipBuffer } from 'zipcage';

try {
  const report = assertSafeZipBuffer(untrustedZipBytes);
  console.log(report.totals.uncompressedBytes);
} catch (error) {
  console.log(error.name, error.code, error.findings);
}
```

`assertSafeZipBuffer` throws `ZipCageError` for the first finding. The error's
`findings` property contains every finding collected during inspection.

## Inspection report

```js
import { inspectZipBuffer } from 'zipcage';

const report = inspectZipBuffer(buffer);

report.safe;
report.entries[0].name;
report.entries[0].compressedSize;
report.entries[0].uncompressedSize;
report.entries[0].compressionRatio;
report.entries[0].unixFileType;
report.totals.entries;
report.findings.map((finding) => finding.code);
```

The report is frozen. Entry data includes central-directory facts, verified
local-header facts, normalized path segments, Unix file type information,
compression sizes, data offsets and whether encryption, UTF-8 names or data
descriptors are in use.

Inspection is structural. It verifies header agreement, layout, sizes, ratios,
path safety and file type metadata before extraction. It does not inflate every
entry merely to produce a report, because that itself would spend attacker-
controlled work. Actual bytes are verified when `readZipEntry` or
`extractZipBuffer` is called.

## Reading one entry

```js
import { readZipEntry } from 'zipcage';

const bytes = await readZipEntry(buffer, 'docs/readme.txt');
```

The whole archive must first pass inspection. Stored entries must have equal
compressed and uncompressed sizes. Deflate entries are decompressed through
`createInflateRaw` while output bytes are counted. Inflation aborts as soon as
actual output exceeds the smaller of the declared entry size and
`maxEntryUncompressedBytes`. After the stream ends, the consumed compressed byte
count, exact output size and CRC-32 are checked against the central directory.

This matters when a header lies. A small declared size does not allow a large
deflate stream through, because the cap is enforced on actual output bytes as
they are produced.

## Safe extraction

```js
import { extractZipBuffer } from 'zipcage';

const result = await extractZipBuffer(buffer, '/path/to/existing/target', {
  overwrite: false
});

console.log(result.entriesWritten, result.bytesWritten);
```

The target directory must already exist and is canonicalized with `realpath`.
Each parent component is checked with `lstat` before use. Symlinks inside the
target are never traversed or overwritten. Archive symlinks, FIFOs, sockets and
device entries are never written, even when inspection options allowed them to
be reported.

Files are written completely to a same-directory temporary file, flushed,
chmodded to `0644` and then installed. With the default `overwrite: false`, a
hard-link install atomically fails if the destination exists. With
`overwrite: true`, a rename replaces only an existing regular file. Directories
use `0755`. Setuid, setgid and executable permission bits from an archive are
never preserved.

Portable JavaScript cannot provide kernel-level `openat2` or `O_NOFOLLOW`
races protection on every supported operating system. The library checks each
component immediately before use and performs same-directory atomic installs,
but a hostile local process racing extraction is outside the stronger threat
model. Use a private empty extraction directory for untrusted archives.

## Reusable guard

```js
import { createZipGuard } from 'zipcage';

const guard = createZipGuard({
  maxEntries: 100,
  maxEntryUncompressedBytes: 5 * 1024 * 1024,
  maxTotalUncompressedBytes: 20 * 1024 * 1024
});

const report = guard.inspect(buffer);
const bytes = await guard.readEntry(buffer, 'safe.txt');
await guard.extract(buffer, targetDirectory);
```

Guards are frozen. Per-call overrides are validated and copied without mutating
the guard.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `maxEntries` | `1000` | Maximum central-directory entries. |
| `maxEntryUncompressedBytes` | `52428800` | Maximum uncompressed bytes for one file, 50 MiB. |
| `maxTotalUncompressedBytes` | `209715200` | Maximum aggregate uncompressed bytes, 200 MiB. |
| `maxCompressionRatio` | `100` | Maximum per-entry and aggregate compression ratio. |
| `maxArchiveBytes` | `536870912` | Maximum input archive byte length, 512 MiB. |
| `maxDepth` | `20` | Maximum path segment count. |
| `maxPathLength` | `512` | Maximum UTF-8 byte length of one entry path. |
| `allowSymlinks` | `false` | Permit symlinks in inspection reports. Extraction still refuses them. |
| `allowSpecialFiles` | `false` | Permit FIFO, socket, device and unknown special types in reports. Extraction still refuses them. |
| `allowSuidSgid` | `false` | Permit setuid or setgid bits in reports. Extraction never preserves them. |
| `allowEncrypted` | `false` | Permit encrypted entries in reports. They cannot be read or extracted. |
| `allowPrototypePollutingNames` | `false` | Permit exact `__proto__`, `constructor` and `prototype` path segments. |
| `caseInsensitiveDuplicates` | `true` | Reject case and Unicode-normalization-only duplicate paths. |
| `rejectPolyglot` | `true` | Reject prepended, trailing and unaccounted interior bytes. |
| `overwrite` | `false` | Permit extraction to replace existing regular files. Symlinks are never replaced. |

Unknown option keys and the reserved keys `__proto__`, `constructor` and
`prototype` are rejected. Configuration objects are copied into null-prototype
internal state and frozen.

## Path policy

A safe path is a relative, slash-separated UTF-8 or CP437 path with no empty
segments. The following are rejected:

- `..` and `.` segments rather than silent normalization
- Leading slashes and leading backslashes
- UNC paths such as `//server/share` and `\\\\server\\share`
- Windows drive-relative and drive-absolute paths such as `C:evil` and `C:/evil`
- Colons that can indicate drives or NTFS alternate data streams
- NUL bytes and C0 or C1 control characters
- Windows device names including `CON`, `PRN`, `AUX`, `NUL`, `COM1` through
  `COM9` and `LPT1` through `LPT9`, with or without extensions
- Segments ending in a dot or space, which Windows strips
- Exact and case-insensitive duplicate normalized paths
- Unicode normalization duplicate paths
- File-versus-directory collisions such as `foo` and `foo/bar`
- Exact `__proto__`, `constructor` and `prototype` segments by default

These rules are intentionally stricter than a minimum Linux-only extractor
because archives are commonly extracted on macOS and Windows too.

## Zip-bomb policy

The inspector enforces entry count, per-entry uncompressed size, aggregate
uncompressed size and compression-ratio limits. It also sorts compressed data
ranges and rejects overlapping ranges. Overlap detection covers the non-
recursive David Fifield style zip-bomb primitive where multiple central entries
reference overlapping compressed bytes.

Header sizes alone are never trusted during decompression. Actual inflate output
is counted byte by byte as stream chunks arrive and inflation is destroyed when
the configured cap is crossed.

## Parser-differential policy

For every central-directory entry, the referenced local file header must exist
and agree on filename bytes, compression method, flags and version needed. When
bit 3 is clear, CRC-32, compressed size and uncompressed size must also agree.
When bit 3 is set, the data descriptor is present and checked against the
central directory. Both signed and unsigned data descriptors are accepted, with
exact compressed-size, uncompressed-size and CRC-32 agreement required.

Info-ZIP Unicode Path extra fields (`0x7075`) are validated rather than
preferred. A field must be version 1, valid UTF-8, carry the correct CRC-32 of
the primary filename bytes and decode to exactly the same filename. A different
Unicode path is rejected as `ERR_ZIPCAGE_UNICODE_PATH_MISMATCH` because other
unzippers may prefer it and extract a different path. Duplicate or malformed
Unicode path fields are rejected as ambiguous.

The end-of-central-directory scan also rejects multiple structurally plausible
EOCD records. A forged EOCD inside a ZIP comment or trailing data is therefore
not allowed to silently replace the real end record. Because trailing bytes make
EOCD provenance ambiguous, setting `rejectPolyglot: false` also treats an EOCD
embedded in stored file data as ambiguous. The strict default correctly ignores
those embedded payload bytes and uses the outer end record.

Local records must be contiguous in physical order when `rejectPolyglot` is
true. Compressed data may not overlap another compressed range or the next
local file header. Prepended self-extracting bytes, trailing bytes and interior
unaccounted gaps are rejected by default.

## Building test ZIPs

```js
import { createZipBuffer } from 'zipcage';

const archive = createZipBuffer([
  { name: 'plain.txt', data: 'stored text' },
  { name: 'compressed.txt', data: 'repeated repeated repeated', method: 'deflate' },
  { name: 'docs/', directory: true }
]);
```

`createZipBuffer` is a small deterministic classic-ZIP writer intended for
tests, fixtures and controlled utility archives. It uses a fixed DOS timestamp
by default. Its default `validate: true` checks output with zipcage's strict
security policy. Advanced fields such as `localNameBytes`, `compressedData`,
size overrides and `centralLocalHeaderOffset` exist so security tests can build
mismatched and overlapping fixtures with `validate: false`.

Do not use adversarial builder fields to construct archives for distribution.
The builder is not a general-purpose ZIP compressor. It supports only stored
and raw-deflate entries in the classic 32-bit ZIP format.

## Limitations

- ZIP64 is intentionally unsupported. ZIP64 sentinel values and ZIP64 extra
  fields are rejected.
- Multi-disk archives are unsupported and rejected.
- Only stored method 0 and deflate method 8 are supported. Bzip2, LZMA, PPMd,
  zstd and other methods are rejected.
- Encrypted entries cannot be read or extracted. Traditional PKZIP encryption
  and strong encryption are outside the security model.
- Archives are supplied as buffers, so the complete archive already occupies
  caller memory. `maxArchiveBytes` bounds acceptance but cannot undo allocation
  that happened before the library was called.
- `readZipEntry` returns a Buffer and extraction verifies each complete file
  before install, so one output file can occupy memory up to the configured
  per-entry cap. Inflation is chunked and bounded, but the API is not a sparse
  or streaming-to-disk API.
- CP437 is used for names when the UTF-8 flag is clear. Tools that ignore the
  ZIP specification and use another legacy encoding can display those names
  differently.
- The inspector is not a sandbox for archive content. A safe text file can still
  be unsafe HTML, SVG, an executable or malicious application data. Validate or
  scan content at the application layer.
- Symlink race protection is limited by portable Node.js filesystem APIs. Use a
  private empty target directory for hostile archives.
- Digital signatures, archive extra data records and rare alignment padding are
  treated as strict structural anomalies when polyglot rejection is enabled.
- Unicode Path extra fields that carry a different name from the primary ZIP
  filename are rejected. Archives that depend on that replacement behavior are
  outside the supported extraction scope because unzip implementations differ.

These are scope boundaries, not silent exceptions. Unsupported structures fail
closed with stable machine-readable error codes.

## Development

No install step is required.

```sh
node scripts/build-cjs.mjs
npm test
npm pack --dry-run
```

The test command is `node --test tests/*.test.mjs`. CI runs Node 18, 20, 22
and 24 on Ubuntu and Windows. For a Windows `cmd.exe` local run on Node 18 or
20, use `npm run test:windows`.

## Security

See `SECURITY.md` for reporting instructions and scope. Do not open public
issues with working exploit archives.
