import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLessonCommand, addLesson, LESSONS_HEADER, MAX_LESSONS } from '../src/lessons/add-lesson.js';

test('parses a /lesson command from a review comment', () => {
  assert.equal(
    parseLessonCommand('Nice work.\n/lesson Use the CaseSelector class instead of inline SOQL\nthanks'),
    'Use the CaseSelector class instead of inline SOQL'
  );
  assert.equal(parseLessonCommand('just a normal comment'), null);
  assert.equal(parseLessonCommand('/lesson ok'), null, 'too short to be a rule');
});

test('creates the lessons file with an applyTo header on first use', () => {
  const r = addLesson(null, 'Always use Custom Labels for UI text', { pr: 12, path: 'lwc/caseContact/caseContact.html' });
  assert.equal(r.added, true);
  assert.ok(r.text.startsWith(LESSONS_HEADER));
  assert.match(r.text, /- Always use Custom Labels for UI text\. _\(PR #12, lwc\/caseContact\/caseContact\.html\)_/);
});

test('ignores duplicates, case and punctuation insensitive', () => {
  const first = addLesson(null, 'Always use Custom Labels for UI text', { pr: 12 });
  const again = addLesson(first.text, 'always use custom labels for UI text!', { pr: 15 });
  assert.equal(again.added, false);
  assert.equal(again.reason, 'duplicate');
});

test('stops growing at the cap, to keep the agent context small', () => {
  let text = null;
  for (let i = 0; i < MAX_LESSONS; i++) text = addLesson(text, `Rule number ${i} for the agent`).text;
  const r = addLesson(text, 'One rule too many for the file');
  assert.equal(r.added, false);
  assert.equal(r.reason, 'full');
});
