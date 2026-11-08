/**
 * The self-improving loop.
 *
 * A reviewer comments `/lesson <rule>` on an agent PR. The rule is appended to
 * .github/instructions/lessons.instructions.md (applyTo "**"), which the agent reads on
 * every future task, via a small PR a human approves. Mistakes get fixed once, not every sprint.
 */

export const DEFAULT_LESSONS_FILE = '.github/instructions/lessons.instructions.md';
export const MAX_LESSONS = 60;

export const LESSONS_HEADER = `---
applyTo: "**"
---

# Lessons from code review

Rules learned from reviewer feedback on agent PRs. Each one came from a \`/lesson\` comment.
Follow them in addition to \`.github/copilot-instructions.md\`.
Keep this file short: when it passes ${MAX_LESSONS} lessons, merge related ones into the main instructions.

`;

/** Returns the lesson text from a comment body, or null. Only the first `/lesson` line counts. */
export function parseLessonCommand(body = '') {
  const m = body.match(/^\s*\/lesson\s+(.+?)\s*$/im);
  if (!m) return null;
  const text = m[1].replace(/\s+/g, ' ').trim();
  return text.length >= 8 ? text : null;
}

const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/**
 * @param {string|null} fileText  Current lessons file (null if it does not exist yet).
 * @param {string} lesson
 * @param {{pr?:number|string, path?:string}} [meta]
 * @returns {{text:string, added:boolean, reason?:string, count:number}}
 */
export function addLesson(fileText, lesson, meta = {}) {
  const current = fileText && fileText.trim() ? fileText : LESSONS_HEADER;
  const existing = current.split('\n').filter((l) => l.startsWith('- '));
  const lessonText = lesson.replace(/\.$/, '');

  if (existing.some((l) => normalise(l.replace(/_\(.*\)_\s*$/, '')).includes(normalise(lessonText)))) {
    return { text: current, added: false, reason: 'duplicate', count: existing.length };
  }
  if (existing.length >= MAX_LESSONS) {
    return { text: current, added: false, reason: 'full', count: existing.length };
  }

  const source = [meta.pr ? `PR #${meta.pr}` : '', meta.path ?? ''].filter(Boolean).join(', ');
  const line = `- ${lessonText}.${source ? ` _(${source})_` : ''}`;
  const gap = existing.length === 0 ? '\n\n' : '\n';
  const text = `${current.replace(/\s*$/, '')}${gap}${line}\n`;
  return { text, added: true, count: existing.length + 1 };
}
