# Code map — <REPO NAME>

> The agent reads this first, instead of exploring the repo. A good map is the single
> biggest token saver: it replaces dozens of directory listings and file reads.
> Keep it under ~150 lines. Regenerate or review it monthly, or when structure changes.

## Feature → files
| Feature / screen | JSON config | LWC(s) | Apex | Tests |
|------------------|-------------|--------|------|-------|
| Case 360 summary | `<configs/case360.json>` | `c-renderer`, `c-field-section` | `CaseSummaryController` | `caseSummary.test.js`, `CaseSummaryControllerTest` |
| <feature> | `<…>` | `<…>` | `<…>` | `<…>` |

## Renderer framework
| Concern | File |
|---------|------|
| Root component | `force-app/main/default/lwc/<renderer>/` |
| Type → component registry | `<path/registry.js>` |
| JSON schema | `<path/schema.json>` |
| Golden example configs | `<path/examples/>` |

## Shared utilities (reuse, don't recreate)
| Need | Use |
|------|-----|
| Test data | `TestDataFactory` |
| Logging | `<Logger>` |
| Constants / config | `<Constants class>` / `<Custom Metadata type>` |
| Jest mocks for wire adapters | `<path/jest-mocks/>` |

## Ignore (never open)
`node_modules/`, `.sfdx/`, `.sf/`, `coverage/`, `force-app/**/staticresources/`, `package-lock.json`
