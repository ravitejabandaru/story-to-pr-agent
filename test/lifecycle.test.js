import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createActor } from 'xstate';
import { storyToPrMachine, outcomeOf } from '../src/lifecycle/machine.js';
import { parseStoryMarkdown } from '../src/readiness/parse-story.js';

const story = (name) => parseStoryMarkdown(readFileSync(new URL(`../examples/stories/${name}`, import.meta.url), 'utf8'));

function run(events, input) {
  const actor = createActor(storyToPrMachine, { input }).start();
  for (const e of events) actor.send(e);
  return actor.getSnapshot();
}

test('happy path: ready story → merged as-is', () => {
  const s = run([
    { type: 'START', story: story('ready.md') },
    { type: 'PLAN_DONE' },
    { type: 'TESTS_WRITTEN' },
    { type: 'IMPLEMENTED' },
    { type: 'CHECKS_PASSED' },
    { type: 'PR_OPENED', number: 482 },
    { type: 'MERGED' }
  ]);
  assert.equal(s.value, 'merged');
  assert.equal(s.context.storyKey, 'PAY-1432');
  assert.equal(s.context.prNumber, 482);
  assert.equal(outcomeOf(s), 'merged-as-is');
});

test('a story that is not ready never reaches planning', () => {
  const s = run([{ type: 'START', story: story('not-ready.md') }, { type: 'PLAN_DONE' }]);
  assert.equal(s.value, 'needsInfo');
  assert.equal(s.context.questions.length, 4);
});

test('updating the story re-runs the readiness check', () => {
  const s = run([
    { type: 'START', story: story('not-ready.md') },
    { type: 'STORY_UPDATED', story: story('ready.md') }
  ]);
  assert.equal(s.value, 'planning');
});

test('coding cannot start before tests are written', () => {
  const s = run([
    { type: 'START', story: story('ready.md') },
    { type: 'PLAN_DONE' },
    { type: 'IMPLEMENTED' }
  ]);
  assert.equal(s.value, 'testsFirst');
});

test('fix loop is capped: 3 failed checks → draft PR flagged as failing', () => {
  const s = run([
    { type: 'START', story: story('ready.md') },
    { type: 'PLAN_DONE' },
    { type: 'TESTS_WRITTEN' },
    { type: 'IMPLEMENTED' }, { type: 'CHECKS_FAILED' },
    { type: 'IMPLEMENTED' }, { type: 'CHECKS_FAILED' },
    { type: 'IMPLEMENTED' }, { type: 'CHECKS_FAILED' }
  ]);
  assert.equal(s.value, 'openingPr');
  assert.equal(s.context.fixAttempts, 3);
  assert.equal(s.context.failedChecks, true);
});

test('max fix attempts is configurable', () => {
  const s = run([
    { type: 'START', story: story('ready.md') },
    { type: 'PLAN_DONE' }, { type: 'TESTS_WRITTEN' },
    { type: 'IMPLEMENTED' }, { type: 'CHECKS_FAILED' }
  ], { maxFixAttempts: 1 });
  assert.equal(s.value, 'openingPr');
});

test('a hard stop hands control back to a human', () => {
  const s = run([
    { type: 'START', story: story('ready.md') },
    { type: 'PLAN_DONE' }, { type: 'TESTS_WRITTEN' },
    { type: 'HARD_STOP', reason: 'needs a new npm dependency' }
  ]);
  assert.equal(s.value, 'needsInfo');
  assert.equal(s.context.hardStopReason, 'needs a new npm dependency');
});

test('review rounds are counted and reset the fix budget', () => {
  const s = run([
    { type: 'START', story: story('ready.md') },
    { type: 'PLAN_DONE' }, { type: 'TESTS_WRITTEN' },
    { type: 'IMPLEMENTED' }, { type: 'CHECKS_FAILED' },
    { type: 'IMPLEMENTED' }, { type: 'CHECKS_PASSED' },
    { type: 'PR_OPENED', number: 7 },
    { type: 'CHANGES_REQUESTED' },
    { type: 'IMPLEMENTED' }, { type: 'CHECKS_PASSED' },
    { type: 'PR_OPENED', number: 7 },
    { type: 'MERGED' }
  ]);
  assert.equal(s.context.reviewRounds, 1);
  assert.equal(s.context.fixAttempts, 0);
  assert.equal(outcomeOf(s), 'merged-after-changes');
});
