/**
 * Parses a Jira story written with templates/jira-story-template.md into a plain object.
 * Works on the Markdown you get from the Jira API (description rendered as Markdown)
 * or from a file. Missing sections come back empty, never undefined.
 */

const HEADING = /^#{2,4}\s+(.+?)\s*$/;

function field(md, label) {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i');
  const m = md.match(re);
  if (!m) return '';
  return m[1].replace(/`/g, '').replace(/←.*$/, '').trim();
}

function sections(md) {
  const out = {};
  let current = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(HEADING);
    if (h) {
      current = h[1].toLowerCase();
      out[current] = [];
    } else if (current) {
      out[current].push(line);
    }
  }
  return out;
}

function findSection(all, ...names) {
  const key = Object.keys(all).find((k) => names.some((n) => k.startsWith(n)));
  return key ? all[key].join('\n').trim() : '';
}

function listItems(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^(\d+[.)]|[-*])\s+/.test(l))
    .map((l) => l.replace(/^(\d+[.)]|[-*])\s+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

function codeBlock(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : '';
}

export function parseStoryMarkdown(md) {
  const all = sections(md);
  const title = (md.match(/^#\s+(.+)$/m) || [])[1] || '';
  return {
    key: (title.match(/[A-Z][A-Z0-9]+-\d+/) || [])[0] || '',
    title: title.replace(/^[A-Z][A-Z0-9]+-\d+[:\s-]*/, '').trim(),
    repository: field(md, 'Repository'),
    component: field(md, 'Component / module'),
    changeType: field(md, 'Change type'),
    userStory: findSection(all, 'user story'),
    acceptanceCriteria: listItems(findSection(all, 'acceptance criteria')),
    sampleJson: codeBlock(findSection(all, 'sample data', 'sample json')),
    pattern: findSection(all, 'pattern to follow').replace(/^similar existing feature:\s*/i, '').replace(/`/g, '').trim(),
    outOfScope: listItems(findSection(all, 'out of scope')),
    crossRepo: findSection(all, 'cross-repo')
  };
}
