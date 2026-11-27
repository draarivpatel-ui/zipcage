# Security Policy

## Supported versions

Only the latest published `1.x` release receives security fixes. Users should
upgrade promptly when a security release is published.

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| Older than 1.0.0 | No |

## Reporting a vulnerability

Report suspected vulnerabilities privately through the GitHub Security Advisories form: [Report a vulnerability](https://github.com/draarivpatel-ui/zipcage/security/advisories/new). Do not open a public issue, pull request or discussion with a working exploit archive.

Include:

- The exact package version and Node.js version
- Whether input came through `inspectZipBuffer`, `assertSafeZipBuffer`,
  `readZipEntry`, `extractZipBuffer` or a guard method
- The complete options object, with secrets removed
- A minimal base64-encoded or hex-encoded ZIP fixture
- The expected safe result and the actual result or error code
- Whether behavior differs between ESM and CommonJS or between operating
  systems

A useful report does not need a large application reproduction. A small script
that imports the package and prints the report or error code is enough.

## Scope

In scope:

- CWE-22 Zip-Slip or path traversal bypasses in accepted entries
- CWE-409 decompression bomb bypasses in enforced size and ratio limits
- Overlapping compressed data ranges that avoid detection
- Symlink, hardlink-like overwrite, FIFO, socket or device extraction bypasses
- Parser differentials between central directory, local header and data
  descriptor fields that produce unsafe extraction
- CRC-32 or exact-size verification bypasses
- Prototype pollution through supported option objects
- ESM and CommonJS behavior differences with security impact
- Extraction writes outside the canonical target directory

Out of scope:

- ZIP64, multi-disk archives and encrypted archives, which are explicitly
  rejected rather than supported
- Compression methods other than stored and deflate, which are explicitly
  rejected
- Malicious application content inside an otherwise safe regular file, such as
  HTML, SVG, macros or executables
- A hostile local process racing extraction in a shared writable directory
- Denial of service caused by allocating a very large input buffer before the
  buffer reaches the library
- Resource use after a caller intentionally raises documented limits far above
  the defaults
- Reports requiring a modified Node.js runtime or a nonstandard zlib build

## Response expectations

We acknowledge reports within 48 hours. We aim to confirm or reject the report within 7 days, release a fix as soon as practical, and coordinate public disclosure with the reporter. Unless a shorter deadline is required by an actively exploited issue, please allow up to 90 days for a coordinated fix and disclosure. Credit is given in release notes only when the reporter asks for it.

## Hardening guidance

Use the default limits unless there is a measured need to change them. Extract
into a private empty directory, keep `overwrite` false, keep symlink and
special-file allowances off, and treat extracted content as untrusted data. Use
`assertSafeZipBuffer` where silent manual inspection of a report could hide an
integration error.
