# Adopting Story-to-PR in a repository

Assumes the Copilot coding agent and the Copilot for Jira integration are already enabled.

## 1. Copy the templates

Copy everything under [`templates/repo/`](../templates/repo) into the target repository:

| File | Fill in |
|---|---|
| `.github/agents/jira-to-pr.agent.md` | Nothing. Keep it identical in every repo so every repo follows the same workflow. |
| `.github/copilot-instructions.md` | Purpose, repo map, commands, architecture rules, protected paths. Keep it to about 2 pages. |
| `.github/instructions/json-lwc-renderer.instructions.md` | Salesforce repos with a JSON → LWC renderer: registry, schema, golden examples. |
| `.github/instructions/apex.instructions.md` | Salesforce repos: layering, logging and test factory class names. |
| `.github/instructions/lessons.instructions.md` | Nothing. The lessons workflow fills it. |
| `docs/agent/code-map.md` | Feature → files table. This is the biggest token saver. |
| `scripts/agent-check.sh` | Your real lint, JSON-schema and test commands. Add `"agent:check": "bash scripts/agent-check.sh"` to `package.json`. |
| `.github/workflows/copilot-setup-steps.yml` | Runtime versions and installs. Must be on the default branch. |
| `.github/workflows/story-to-pr-guardrails.yml` | Check `agent-logins` matches the author of your agent PRs. |
| `.github/workflows/story-to-pr-lessons.yml` | Nothing. |
| `.github/story-to-pr.json` | Optional overrides: `maxFiles`, `protectedPaths`, `requiredSections`, `branchPattern`. |

For non-Salesforce repos, drop the two Salesforce instruction files and rewrite the
architecture section of `copilot-instructions.md` for that stack.

## 2. Protect the branch

In branch protection for the default branch:
- Require the **Story-to-PR guardrails** check.
- Require at least one human approval.
- Keep agent PRs as drafts until a human marks them ready.

## 3. Gate stories before assignment

Put [`templates/jira-story-template.md`](../templates/jira-story-template.md) into the Jira issue template.
Run the readiness linter before assigning a story to the agent:

```bash
npx -p github:ravitejabandaru/story-to-pr-agent story-ready story.md   # exit 0 = ready
```

Or call it from code (for example a Jira Automation webhook handler):

```js
import { parseStoryMarkdown } from 'story-to-pr-agent/src/readiness/parse-story.js';
import { scoreStory } from 'story-to-pr-agent/src/readiness/score-story.js';

const result = scoreStory(parseStoryMarkdown(description));
if (!result.ready) postJiraComment(issueKey, result.questions);
```

## 4. Teach it

When a review comment points out something the agent should always do, add a line starting
with `/lesson`:

```text
/lesson Use CaseSelector for case queries; never write inline SOQL in services
```

A PR appears that appends the rule to `lessons.instructions.md`. Merge it, and the agent
follows the rule on every future task. Only owners, members and collaborators can add lessons.

## 5. Optional: let the agent fix guardrail findings itself

Set `ask-agent: "true"` on the guardrails step. When there are errors, the Action posts a
new comment mentioning the agent with the findings, and the agent pushes a fix. Each round
costs agent credits, so turn this on once the pilot is stable.

## Rollout

1. One repo, config-only stories, for 2 weeks.
2. Review every PR the guardrails flagged, and add lessons.
3. Add Apex or backend stories, then more repos.
4. Track the metrics in the README and compare them with the manual baseline.
