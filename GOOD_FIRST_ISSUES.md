# Good first issues

These starter ideas are deliberately bounded. Each can be completed without
changing the package's zero-dependency or fail-closed design.

## 1. Design ZIP64 support

Write a parser design for ZIP64 end records, locators and 64-bit extra fields.
Include overflow checks, limits and parser-differential tests before writing
implementation code.

## 2. Add a TypeScript consumer smoke fixture

Create a small type-only fixture that imports every public function and option
type. It must not add TypeScript or any other devDependency. CI can inspect it
as a source fixture rather than compiling it.

## 3. Expand the attack fixture corpus

Add deterministic tests for additional public Zip-Slip and zip-bomb structures.
Each fixture needs the exact error code and a short reason it belongs in the
corpus.

## 4. Improve error code documentation

Add a README table grouping every public `ERR_ZIPCAGE_*` code by caller action.
Keep descriptions short and verify each code against `types/index.d.ts`.

## 5. Add a data-descriptor compatibility matrix

Build unsigned and signed data-descriptor fixtures and document which strict
checks apply. Keep the tests deterministic and avoid external ZIP tools.

## 6. Write integration guidance for upload pipelines

Document how to inspect an upload before extraction, extract into a private
empty directory, and scan extracted content at the application layer. Do not
add a web framework dependency.

## 7. Add a performance smoke benchmark

Add a local, non-CI benchmark script that measures inspection and bounded
inflation of representative archives without external packages. Keep it out of
the published tarball and document that results are machine-dependent.

## 8. Review CP437 and UTF-8 examples

Audit filename encoding examples against real central-directory flag bits. Add
fixtures only where the expected parser behavior is unambiguous.

## 9. Improve issue templates

Make the bug report template easier for non-experts to complete while preserving
the fixture, options, expected result and actual result fields.

## 10. Add a release checklist

Write a maintainer checklist covering generated CommonJS freshness, exact test
count, pack dry-run contents, documentation accuracy and security note review.
Do not automate publishing.
