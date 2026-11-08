# Token use, precision and performance

Since 1 June 2026, Copilot charges for agent work in AI credits, based on the input,
output and cached tokens each session uses, at the price of the model chosen. The old
"one premium request per session" rule now applies only to legacy plans. So tokens are a
real cost line, and they track quality closely: an agent that wanders through the repo
is both expensive and more likely to edit the wrong thing.

Almost all agent tokens are INPUT: files read, logs read and re-read across turns.
Reducing what the agent has to read is the main lever for all three goals.

---

## 1. Reduce token use

| Lever | How | Kit file |
|-------|-----|----------|
| **Code map instead of exploration** | The agent reads a one-page feature → files index first, instead of listing directories and opening files to orient itself. | `docs/agent/code-map.md` |
| **Short, stable instructions** | Each instructions file is resent on every turn. Keep `copilot-instructions.md` to ~2 pages. Move stack-specific rules into `applyTo` files so Apex rules don't load for a JSON-only change. Keep the files unchanged between runs so they are cached and billed at the lower cached rate. | `.github/instructions/*` |
| **Quiet verification** | One command that prints PASS/FAIL and only the failing lines. Full Jest or ESLint logs can be thousands of tokens per run, and the agent may run them 5–10 times. | `scripts/agent-check.sh` |
| **Pre-built environment** | Dependencies are installed before the agent starts, so it doesn't burn turns working out how to install them or recovering from install failures. | `copilot-setup-steps.yml` |
| **Ignore list** | Tell the agent never to open `node_modules`, `.sfdx`, static resources, coverage or lock files. A single minified file can be larger than the whole task. | agent file, step 0 |
| **Retry cap** | Stop after 3 failed fix attempts and open the PR with an explanation. Fix loops are where runaway sessions come from. | agent file, step 5 |
| **Small stories** | One repo, one component, fewer than ~15 files. Cost grows faster than story size, because every turn re-reads a growing context. | Jira template |
| **Readiness gate** | A vague story spends a full session and produces a PR that gets rejected. Asking two questions in Jira costs almost nothing. | agent file, step 1 |
| **Fewer steering rounds** | Each "please also change X" comment on the PR starts more agent work. Good acceptance criteria up front are cheaper than review ping-pong. | Jira template |

## 2. Improve precision

- **Golden examples.** For each common story type (new field, conditional field, table,
  action), keep one example config and its component, and list them in the renderer
  instructions. Copying a nearby, correct example is the most reliable way to get
  output in your house style.
- **Deterministic gates over model judgement.** JSON-schema validation, ESLint, Prettier
  and Jest catch whole categories of mistakes for free. Every rule you can turn into a
  check should become a check, not a sentence in the instructions.
- **Acceptance criteria → tests first.** The tests become the agent's own target, and the
  AC → evidence table in the PR makes gaps obvious to the reviewer.
- **Config-first rule.** "Change JSON before writing new components" shrinks the space of
  possible solutions, so there are fewer ways to be wrong.
- **Turn every bad PR into a rule.** When a PR needs rework, add one line to the relevant
  instructions file or one example to the code map. Precision improves week by week. Keep a
  changelog of these fixes for your portfolio.

## 3. Improve performance (speed)

- **Cache dependencies** in `copilot-setup-steps.yml` (`setup-node` with `cache: npm`).
- **Use a larger runner** if `npm ci` plus Jest takes more than a few minutes. The setup job
  supports larger runner labels.
- **Changed tests first, full suite once.** `npm run agent:check -- --changed` while
  iterating, the full run before the PR.
- **Keep Apex tests out of the inner loop** if they need an org. Let CI run them on the PR
  instead of making the agent wait on a scratch org.

## 4. Match the model to the story type

Run a short bake-off: about 10 real stories per model, scoring merge without rework and
credits per merged PR. Then set defaults by story type. Prices are per token and differ
several-fold between models, so routing matters.

| Story type | Starting point |
|------------|----------------|
| JSON config-only, labels, small bug fixes | Cheaper or faster model |
| Extending an existing LWC or Apex service | Mid-tier model |
| New component type, cross-cutting Apex, tricky bugs | Strongest model |

Choose the model when assigning the story. Copilot for Jira supports picking the model.

## 5. Measure it

Track these per story and per model. They are your before/after evidence:

- AI credits per merged PR (the real cost metric, not credits per session)
- Agent session duration, and the number of `agent:check` runs per session
- % of PRs merged without rework
- Review comments per PR
- Set budget limits per org or cost centre so a runaway session can't surprise anyone
