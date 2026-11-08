---
applyTo: "force-app/**/lwc/**,<path to JSON configs>/**/*.json"
---

# JSON → LWC rendering framework

This is the most important file for this repo. The framework is in-house, so the model
has never seen it. Everything it needs to know must be written here or linked from here.

## How the renderer works (fill in)
- Entry component: `c-<renderer-root>`. It receives `<config input>` and renders sections
  and fields from the JSON.
- Component registry: `<path/to/registry.js>` maps the JSON `type` value to an LWC.
- Data binding: `<how JSON fields bind to record data, e.g. "field": "Case.Status">`
- Events: `<event names and payloads child components emit>`
- Visibility / conditional logic: `<syntax used in JSON, e.g. "visibleWhen">`

## The JSON contract
- The schema at `<path/to/schema.json>` is the source of truth. Every config change MUST
  validate against it (`npm run validate:json`).
- Do not add, rename or remove schema properties unless the story explicitly asks for it.
  A schema change is a breaking change for every screen. Flag it in the PR as high risk.
- Unknown properties must be ignored safely by the renderer, never crash it.

## Choosing the change type (in this order)
1. **Config-only**: the story can be met by editing or adding JSON. This is the preferred path.
2. **Extend an existing component**: add an option that is driven from JSON.
3. **New component type**: only if 1 and 2 cannot work. Register it in the registry, add
   it to the schema, add an example config, and add Jest tests. Explain why in the PR.

## Reference examples (copy these patterns)
| Need | Example config | Component |
|------|----------------|-----------|
| Simple field section | `<path/example-section.json>` | `<c-section>` |
| Conditional field | `<path/example-conditional.json>` | `<c-field>` |
| Related list / table | `<path/example-table.json>` | `<c-table>` |
| Action button | `<path/example-action.json>` | `<c-action>` |

## Tests required for renderer changes
- Jest: render the component with the example JSON and assert on the DOM.
- Jest: an empty config, missing optional properties and an unknown `type` must each
  render a safe fallback, not throw.
- A config change should include a snapshot or fixture test that loads the real JSON file.

## LWC rules
- Use Lightning Data Service / `@wire` before Apex. Imperative Apex only when needed.
- No hard-coded labels: use Custom Labels. Respect field-level security from the UI API.
- Accessibility: every input has a label; use SLDS classes, no inline styles.
