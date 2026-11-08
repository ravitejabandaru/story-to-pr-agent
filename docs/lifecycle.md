# The run lifecycle

`src/lifecycle/machine.js` models one agent run as an XState v5 statechart. It is the
single source of truth for what the agent may do next, and it is what the dashboard reads.

## States

| State | Meaning | Leaves on |
|---|---|---|
| `idle` | Story not started | `START { story }` (readiness is scored on entry) |
| `readinessCheck` | Transient: routes on the readiness score | automatic: `planning` if ready, else `needsInfo` |
| `needsInfo` | Questions posted in Jira; no code is written | `STORY_UPDATED { story }` (re-scored), `DECISION_MADE`, `CANCEL` |
| `planning` | Files, pattern to copy, AC coverage | `PLAN_DONE`, `NEEDS_INFO { questions }`, `HARD_STOP { reason }` |
| `testsFirst` | One failing test per acceptance criterion | `TESTS_WRITTEN`, `HARD_STOP` |
| `implementing` | Smallest change that meets the ACs | `IMPLEMENTED`, `HARD_STOP` |
| `verifying` | `npm run agent:check` | `CHECKS_PASSED`, `CHECKS_FAILED` (guarded) |
| `openingPr` | Draft PR with the AC → evidence table | `PR_OPENED { number }` |
| `inReview` | Human review | `CHANGES_REQUESTED`, `MERGED`, `CLOSED` |
| `merged` / `closed` / `cancelled` | Final | — |

## Guards and counters

- `isReady`: the readiness linter passed all four checks.
- `canRetry`: `fixAttempts + 1 < maxFixAttempts` (default 3). After the last failed round the
  machine still goes to `openingPr`, with `failedChecks: true`, so the PR explains the failure
  instead of the agent looping and spending credits.
- `reviewRounds` counts `CHANGES_REQUESTED` and resets the fix budget for the new round.
- `outcomeOf(snapshot)` returns `merged-as-is`, `merged-after-changes`, `closed-without-merge`,
  `cancelled` or `in-progress`, the labels the dashboard aggregates.

## See the diagram

Open <https://stately.ai/viz>, paste the `createMachine({...})` config from `machine.js`
(drop the `setup(...)` wrapper), and you get an interactive diagram you can click through.

## Feeding it real events

Map GitHub and Jira events onto machine events, for example from a small webhook service or
an Action:

| Source | Event |
|---|---|
| Jira: story assigned to Copilot | `START` |
| Jira: story edited after questions | `STORY_UPDATED` |
| Agent session log / PR timeline | `PLAN_DONE`, `TESTS_WRITTEN`, `IMPLEMENTED` |
| `agent:check` result in the session | `CHECKS_PASSED` / `CHECKS_FAILED` |
| GitHub `pull_request.opened` | `PR_OPENED` |
| GitHub review `changes_requested` | `CHANGES_REQUESTED` |
| GitHub `pull_request.closed` (merged / not) | `MERGED` / `CLOSED` |

Persist the snapshot (`actor.getPersistedSnapshot()`) per story key and restore it with
`createActor(storyToPrMachine, { snapshot })` when the next event arrives.
