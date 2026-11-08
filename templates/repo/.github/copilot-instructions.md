# Repository instructions — <REPO NAME>

> Template. Fill every <PLACEHOLDER> for each repo. Keep it under ~2 pages:
> the agent reads it on every task, so cut anything that isn't a rule or a fact.

## What this repo is
- Purpose: <one line, e.g. "Service Cloud org metadata + JSON-driven LWC rendering framework">
- Owns: <modules / packages this repo is responsible for>
- Does NOT own: <things that live in other repos — name the repo for each>

## Repo map (where things live)
| Path | Contents |
|------|----------|
| `force-app/main/default/classes` | Apex (services, selectors, domain, controllers) |
| `force-app/main/default/lwc` | LWC — renderer framework + field/section components |
| `<path to JSON configs>` | Screen/layout JSON definitions consumed by the renderer |
| `<path to JSON schema>` | Schema that every JSON config must validate against |
| `<path to tests>` | Apex tests, Jest tests, test data factories |

## Commands the agent MUST run before opening a PR
```bash
npm ci
npm run lint                     # ESLint for LWC
npm run test:unit                # Jest (sfdx-lwc-jest)
npm run validate:json            # <your JSON schema validation script>
npx prettier --check "force-app/**/*.{cls,js,html,json}"
# Apex: <how Apex tests are run in CI, e.g. scratch org job / sf apex run test>
```
If a command cannot run in the agent environment (e.g. needs an org), say so in the PR
under "Risks and reviewer focus" — never claim it passed.

## Architecture rules
- Apex: trigger → handler → service → selector. No SOQL/DML in triggers, loops or controllers.
- All Apex is bulk-safe (200+ records) and uses `WITH USER_MODE` / `Security.stripInaccessible`.
- New UI behaviour is expressed in JSON config first. A new LWC is only allowed when the
  renderer cannot express it — explain why in the PR.
- <your org's naming conventions, prefixes, namespaces>

## Definition of done
- Every acceptance criterion maps to at least one test.
- Apex coverage for changed classes ≥ <85>%. Jest tests for every changed LWC.
- No hard-coded IDs, URLs, labels or record type names (use Custom Labels / Custom Metadata).
- Lint, tests and JSON validation pass.

## Never
- Never commit secrets, org credentials, real customer data or production record IDs.
- Never modify: <protected paths, e.g. CI config, permission sets, sharing rules, managed package code>.
- Never weaken, skip or delete tests to make the build pass.

## Knowledge sources
- <Confluence space / docs folder / design-docs MCP server> — architecture and domain rules
- `docs/renderer/` — JSON renderer contract, supported component types, examples
- <ADR folder> — decisions that must not be reversed without discussion
