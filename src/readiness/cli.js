#!/usr/bin/env node
/**
 * Usage:  story-ready <story.md> [--json]
 * Exit code 0 = ready for the agent, 1 = needs info, 2 = usage error.
 * Use it in a Jira automation webhook, a pre-assignment Action, or locally.
 */
import { readFileSync } from 'node:fs';
import { parseStoryMarkdown } from './parse-story.js';
import { scoreStory } from './score-story.js';

const [, , file, flag] = process.argv;
if (!file) {
  console.error('Usage: story-ready <story.md> [--json]');
  process.exit(2);
}

const story = parseStoryMarkdown(readFileSync(file, 'utf8'));
const result = scoreStory(story);

if (flag === '--json') {
  console.log(JSON.stringify({ key: story.key, ...result }, null, 2));
} else {
  const head = result.ready ? 'READY' : 'NEEDS INFO';
  console.log(`${story.key || file}  ${head}  (${result.score}%)`);
  for (const c of result.checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.label}: ${c.detail}`);
  if (result.questions.length) {
    console.log('\nQuestions to post in Jira:');
    result.questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  }
}
process.exit(result.ready ? 0 : 1);
