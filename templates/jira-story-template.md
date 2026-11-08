# Jira story template — "Ready for Copilot"

Paste this into the Jira issue template (or the description default) for any story that
will be assigned to Copilot. The agent is told to stop and ask if these sections are missing.

---

**Repository:** `<org>/<repo>`            ← exactly one repo per story
**Component / module:** `<e.g. Case 360 screen / renderer field component / CaseService>`
**Change type:** Config-only | Extend component | New component | Apex | Other

### User story
As a <role>, I want <capability>, so that <benefit>.

### Acceptance criteria
1. **Given** <context> **when** <action> **then** <observable result>
2. **Given** … **when** … **then** …
3. Negative case: **Given** <user without permission / empty data> **then** <expected>

### Sample data / JSON
```json
{ "attach or paste the input JSON config or payload this story changes" : "…" }
```
Expected rendered result: <screenshot, mock-up link or description>

### Pattern to follow
Similar existing feature: `<path or component the agent should copy>`

### Out of scope
- <what must NOT change>

### Cross-repo dependencies
- <other repo + Jira key, or "None">

---

## Definition of Ready (checklist before assigning to Copilot)
- [ ] One repo, one component, and fewer than ~15 files expected
- [ ] Every acceptance criterion can be tested
- [ ] Sample JSON/data attached for UI or renderer stories
- [ ] A pattern to follow is named
- [ ] No security, permission or schema-breaking change (those stay with humans for the pilot)
