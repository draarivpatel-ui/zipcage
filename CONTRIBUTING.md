# Contributing

Thank you for helping improve `zipcage`.

## Ground rules

- Keep the package zero-dependency. Do not add runtime dependencies or
  devDependencies.
- Preserve strict fail-closed behavior for untrusted archives.
- Keep `src/index.mjs` the single source of truth. Never edit `cjs/index.cjs`
  directly.
- Run `node scripts/build-cjs.mjs` after changing the source and include the
  generated CommonJS diff.
- Add deterministic binary ZIP fixtures for every behavior change. Include both
  valid and adversarial structures when the change affects parsing or extraction.
- Keep support for Node 18, 20, 22 and 24 on Linux and Windows.
- Do not use em dash or en dash characters in repository files.
- Do not include local machine paths, private account data, tokens or real
  credentials in files, tests or commit messages.

## Development setup

No install step is required because the package has no dependencies.

```sh
node scripts/build-cjs.mjs
npm test
npm pack --dry-run
```

The test command is:

```sh
node --test tests/*.test.mjs
```

CI first verifies that the generated CommonJS build is current and then runs
the same test command on Node 18, 20, 22 and 24 on Linux and Windows. For a
Windows `cmd.exe` local run on Node 18 or 20, use `npm run test:windows`.

## Security-sensitive changes

ZIP parser and extraction changes need a clear threat model in the pull
request. State the attacker-controlled bytes, the parser or filesystem being
defended, the exact differential or write primitive, and why the new behavior
fails closed.

Do not relax these defaults without a strong reason and a separate CVE-quality
analysis:

- Dot segments, absolute paths, drive paths, UNC paths and backslashes are
  rejected.
- Symlinks, FIFOs, sockets, devices and setuid or setgid modes are rejected.
- Encrypted, multi-disk, ZIP64 and unsupported-method entries are rejected.
- Local and central header mismatches are rejected.
- Overlapping compressed data ranges are rejected.
- Unknown and prototype-polluting option keys are rejected.
- Actual inflate output is capped independently of declared header sizes.

## Pull requests

Keep changes focused. Describe the behavior before and after, list the exact
test count from the final local run, and say whether the change affects the
public API. Small documentation fixes are welcome, but inaccurate security
claims are worse than missing documentation.
