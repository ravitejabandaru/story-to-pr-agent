---
name: jira-to-pr
description: Implements one Jira story in this repository end to end. It checks the story is ready, writes tests from the acceptance criteria, implements the change, verifies its own work, and opens a reviewable draft PR.
---

You are implementing ONE Jira story, in THIS repository only.
Work through the steps in order, and do not skip any step.

## 0. Work efficiently (context budget)

- Read `docs/agent/code-map.md` FIRST. Use it to go straight to the right files.
  Do not list or browse the whole repository.
- Search with specific terms (class names, JSON `type` values, component names) before
  opening files. Open only files you will change, plus at most 2 pattern examples.
- Read large files in ranges, not whole. Do not re-read a file you already have.
- Never open generated, vendored or bulk files: `node_modules/`, `.sfdx/`, `.sf/`,
  static resources, `*.min.js`, coverage reports, lock files.
- Run `npm run agent:check` for verification. It prints only failures. Do not run
  the individual tools in verbose mode or paste full logs into your reasoning.
- Run the tests for the files you changed first. Run the full suite once, at the end.
- Keep your Jira updates and PR text short and factual. No restating the story.

## 1. Readiness check (before touching any code)

Confirm the story contains all of the following:
- The target repository (it must be this one) and the component or module affected.
- Acceptance criteria that can be tested, preferably written as Given / When / Then.
- For any change to UI or rendering: a sample JSON payload, or a link to one.
- Out-of-scope notes, where they apply.

If anything is missing, ambiguous or contradictory, STOP and ask in Jira.
- Ask numbered questions that can each be answered in one line.
- Do not guess business rules, field names, labels, permissions or data values.

If the story names a different repository, stop and say so in Jira. Do not implement it here.
If the story also needs changes in another repository, implement only this repository's part
and list the dependency under "Cross-repo dependencies" in the PR.

## 2. Plan

Before editing anything, write a short plan covering:
- the files you will change and why;
- the existing example in this repo that you are copying the pattern from
  (find one: a similar component, class, JSON config, handler or test);
- the acceptance criteria you will cover, and how.

Prefer extending existing patterns over introducing new ones.

## 3. Tests first

- Turn each acceptance criterion into at least one test before you implement.
- Cover the negative and edge cases the criteria imply: empty data, missing fields,
  no access, bulk volumes, unknown JSON properties.
- Use the existing test utilities and data factories. Do not create new ones if one exists.

## 4. Implement

- Make the smallest change that satisfies the acceptance criteria. Do no drive-by refactoring.
- Follow `.github/copilot-instructions.md` and any matching `.github/instructions/*.instructions.md`.
  `lessons.instructions.md` holds rules reviewers taught you on earlier PRs: they override
  your own preferences.
- Stop and ask in Jira instead of doing any of the following:
  - adding a new dependency, library or package;
  - deleting or renaming public APIs, metadata, fields, components or JSON contract properties;
  - changing security, permissions, sharing or authentication configuration;
  - touching more than ~15 files, or files outside the module named in the story.

## 5. Verify

- Run `npm run agent:check` (it runs every build, lint, JSON-schema and test step listed in
  `.github/copilot-instructions.md`).
- Fix any failures you introduced.
- NEVER delete, skip, comment out or weaken a test, or lower a threshold, to make it pass.
- If checks still fail after 3 genuine attempts, stop. Open the draft PR anyway and explain
  the failure, what you tried, and your best hypothesis.

## 6. Branch, commits and PR

The `Story-to-PR guardrails` check enforces everything in this section on every push
(naming, PR sections, scope, protected paths, test integrity, dependencies). If it reports
findings, fix them; never work around them.

- Branch: `<feature|bugfix|chore>/<JIRA-KEY>-<short-kebab-summary>`
- Commits: `<JIRA-KEY>: <imperative summary>`
- PR title: `<JIRA-KEY>: <story title>`
- Write the PR description with exactly these sections:

```
## Summary
One paragraph: what changed and why.

## Acceptance criteria → evidence
| AC | Test(s) | Status |
|----|---------|--------|

## Pattern followed
Link to the existing file, component or JSON config this change was modelled on.

## Knowledge used
Docs, Confluence pages or instruction files you relied on.

## Assumptions
Anything you decided that the story did not state explicitly.

## Cross-repo dependencies
What must change elsewhere, and in which order (or "None").

## Risks and reviewer focus
Where a human reviewer should look hardest.

## Not done
Anything in the story you deliberately did not implement, and why.
```
