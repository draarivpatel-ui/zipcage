## Summary

Describe the behavior change and the reason for it.

## Security analysis

- Archive classes affected:
- Rejected classes affected:
- Parser differential impact:
- Extraction path impact:
- Resource limit impact:
- Prototype pollution impact:
- Backward compatibility impact:

## Verification

- [ ] `node scripts/build-cjs.mjs` produced no unintended diff
- [ ] `npm test` passed locally
- [ ] Exact final test count is stated below
- [ ] `npm pack --dry-run` was inspected
- [ ] New hostile binary fixtures were added for parser or extraction changes
- [ ] No dependencies were added
- [ ] No em dash or en dash characters were added

Exact final test count:

## Notes for reviewers
