// Walks a story through the lifecycle and prints each state: npm run lifecycle:demo
import { readFileSync } from 'node:fs';
import { createActor } from 'xstate';
import { storyToPrMachine, outcomeOf } from '../src/lifecycle/machine.js';
import { parseStoryMarkdown } from '../src/readiness/parse-story.js';

const story = (f) => parseStoryMarkdown(readFileSync(new URL(`./stories/${f}`, import.meta.url), 'utf8'));
console.log('Story arrives incomplete, gets fixed, then runs:');
const actor = createActor(storyToPrMachine, { input: { maxFixAttempts: 3 } });
actor.subscribe((s) => {
  const extra = s.value === 'needsInfo' ? `  → ${s.context.questions.length} question(s) posted in Jira` : '';
  console.log(`  ${String(s.value).padEnd(15)} fixAttempts=${s.context.fixAttempts} reviewRounds=${s.context.reviewRounds}${extra}`);
});
actor.start();

[
  { type: 'START', story: story('not-ready.md') },
  { type: 'STORY_UPDATED', story: story('ready.md') },
  { type: 'PLAN_DONE' },
  { type: 'TESTS_WRITTEN' },
  { type: 'IMPLEMENTED' },
  { type: 'CHECKS_FAILED' },
  { type: 'IMPLEMENTED' },
  { type: 'CHECKS_PASSED' },
  { type: 'PR_OPENED', number: 482 },
  { type: 'MERGED' }
].forEach((e) => actor.send(e));

console.log(`Outcome: ${outcomeOf(actor.getSnapshot())}`);
