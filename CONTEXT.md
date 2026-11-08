# Session context: Story-to-PR Agent

Handoff notes so a new Claude Code session can pick this up. Delete this file before making the repo public, or keep it as a project log.

## Goal

Portfolio project by Raviteja Bandaru (GitHub: `ravitejabandaru`): a harness around the
**GitHub Copilot coding agent** that turns Jira user stories into branch → commits → draft PR,
safely and cheaply. Built for a company that only allows Copilot (Anthropic and OpenAI models
available inside it). Copilot ↔ Jira integration already exists at work; this repo is the
generic, employer-neutral version (examples use a made-up `acme/...` org).

Target stack at work: multiple repos, mostly Salesforce Service Cloud, with an in-house
framework that renders JSON config into LWC components.

## Decisions made

- Repo name: `story-to-pr-agent`. Visibility: **public**. License: MIT.
- Keep everything generic: no employer names, internal URLs or real data.
- Deterministic checks before generative work (readiness, guardrails) to save tokens.
  Copilot bills agent work by tokens since 1 June 2026.
- Lifecycle modelled in **XState v5**.
- Extras chosen to make it stand out: readiness linter, PR guardrails Action, `/lesson` self-improving loop.

## What exists (all committed locally on `main`, NOT pushed yet)

| Path | What |
|---|---|
| `src/readiness/` | `parseStoryMarkdown` + `scoreStory`: zero-token Definition of Ready check (one repo, testable Given/When/Then ACs with no vague words, valid sample JSON for UI changes, named pattern). Writes the questions to post in Jira. CLI: `story-ready`. |
| `src/lifecycle/machine.js` | XState v5 statechart: idle → readinessCheck → needsInfo / planning → testsFirst → implementing → verifying → openingPr → inReview → merged/closed. Guards: `isReady`, `canRetry` (max 3 fix attempts, then a draft PR flagged `failedChecks`). HARD_STOP → needsInfo. Counts reviewRounds. `outcomeOf()` labels for metrics. |
| `src/guardrails/` | `checkPr`: Jira key in title + branch, required PR sections, AC → evidence table rows, max files, protected paths, deleted/skipped/weakened tests, new dependencies. `toMarkdown` report. CLI works locally (`--pr file.json`) and in Actions (reads the event and the PR files API). Zero dependencies. |
| `src/lessons/` | `/lesson <rule>` comment → appended to `.github/instructions/lessons.instructions.md` (deduped, capped at 60). |
| `actions/guardrails/action.yml`, `actions/lessons/action.yml` | Composite actions that target repos call as `ravitejabandaru/story-to-pr-agent/actions/<name>@v1`. |
| `templates/repo/` | What a target repo copies: agent profile (`.github/agents/jira-to-pr.agent.md`), `copilot-instructions.md`, `apex` + `json-lwc-renderer` + `lessons` instruction files, `docs/agent/code-map.md`, `scripts/agent-check.sh`, `copilot-setup-steps.yml`, guardrails and lessons workflows, `story-to-pr.json` config. |
| `templates/jira-story-template.md` | Jira story template and Definition of Ready checklist. |
| `examples/` | `stories/ready.md`, `stories/not-ready.md`, `prs/good-pr.json`, `prs/bad-pr.json`, `lifecycle-demo.js`. |
| `demo/index.html` | Standalone clickable UI demo (Overview / Runs / Intake, hash-routed, light + dark, sample data). Can be served with GitHub Pages. |
| `docs/` | `efficiency.md` (tokens / precision / performance), `lifecycle.md`, `adoption.md`. |
| `.github/workflows/ci.yml` | npm test + demos + guardrails good/bad checks. |
| `README.md` | Portfolio README with Mermaid architecture and lifecycle diagrams. |

Status: `npm test` → 25/25 passing. YAML and shell syntax checked.

## Next steps

1. Review, then push:
   ```bash
   gh repo create ravitejabandaru/story-to-pr-agent --public --source . --push \
     --description "Turn Jira stories into reviewed PRs with the GitHub Copilot coding agent: readiness linter, XState lifecycle, PR guardrails, self-improving lessons loop."
   git tag v1.0.0 && git tag v1 && git push origin v1.0.0 v1
   ```
2. Enable GitHub Pages (Settings → Pages → deploy from `main`, root) and add the demo link
   (`https://ravitejabandaru.github.io/story-to-pr-agent/demo/`) to the README.
3. Add repo topics: `github-copilot`, `coding-agent`, `jira`, `xstate`, `salesforce`, `lwc`, `devx`.
4. Confirm the Copilot agent's PR author login at work (currently `Copilot,copilot-swe-agent[bot]`
   in `agent-logins`).
5. Test the guardrails and lessons Actions end to end on a sandbox repo with a real PR.
6. Ideas not built yet: a metrics workflow that logs agent PR outcomes to CSV for the dashboard;
   wiring the demo UI to real data; persisting lifecycle snapshots per story key from webhooks.

## Related design work (claude.ai artifacts, private to Ravi)

- "Enterprise Case Workspace" design canvas: Service Cloud screens plus Story-to-PR Overview / Run / Intake screens.
- "Story-to-PR Console": the same three automation screens as a clickable page (source of `demo/index.html`).
