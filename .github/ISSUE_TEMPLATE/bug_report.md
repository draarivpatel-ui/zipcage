---
name: Bug report
about: Report incorrect ZIP inspection, extraction or packaging behavior
title: ''
labels: bug
assignees: ''
---

## Summary

Describe the incorrect behavior in one or two sentences.

## Minimal reproduction

```js
import { inspectZipBuffer } from 'zipcage';

const fixture = Buffer.from('BASE64_OR_HEX_HERE', 'base64');
console.log(inspectZipBuffer(fixture, {
  // options here
}));
```

## Fixture and options

- Base64 or hex fixture, or exact builder script:
- Complete options object:
- Node.js version:
- zipcage version:
- Operating system:
- ESM, CommonJS, or both:

## Expected result

State the exact safe report, extraction result or error code you expected.

## Actual result

State the exact report findings, extraction result, error code or exception you
observed.

## Security impact

Does this write outside the target, bypass a size cap, create a special file or
produce an inconsistent parser result? If yes, do not include a working exploit
beyond the minimal fixture needed to reproduce it. Consider using a private
security advisory instead.
