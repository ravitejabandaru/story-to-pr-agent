---
applyTo: "force-app/**/classes/**,force-app/**/triggers/**"
---

# Apex rules

- Follow the trigger → handler → service → selector layering. Find the nearest existing
  class of the same layer and copy its structure.
- Bulk-safe: no SOQL or DML inside loops. Test with 200+ records.
- Security: query `WITH USER_MODE` (or the org standard: `<…>`). Use
  `Security.stripInaccessible` on user-supplied data. Classes are `with sharing` unless the
  story says otherwise and the PR explains why.
- No hard-coded IDs, record type names or profile names. Use Custom Metadata or the
  existing constants class `<…>`.
- Errors: use the existing logging framework `<Logger class>`. Never swallow exceptions.

## Tests
- Use the test data factory `<TestDataFactory class>`. Never use `SeeAllData=true`.
- One test per acceptance criterion, plus negative and bulk tests.
- Assert behaviour with `Assert.areEqual` and messages, not just coverage.
- Run as a restricted user (`System.runAs`) for any permission-related criterion.
