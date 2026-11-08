#!/usr/bin/env node
/**
 * Env: COMMENT_BODY, PR_NUMBER, COMMENT_PATH (optional), LESSONS_FILE (optional).
 * Writes the updated lessons file and sets outputs: added, lesson, reason, count.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseLessonCommand, addLesson, DEFAULT_LESSONS_FILE } from './add-lesson.js';

const file = process.env.LESSONS_FILE || DEFAULT_LESSONS_FILE;
const lesson = parseLessonCommand(process.env.COMMENT_BODY ?? '');
const out = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${String(v).replace(/\n/g, ' ')}\n`);

if (!lesson) {
  console.log('No valid /lesson command found.');
  out('added', false);
  process.exit(0);
}

const before = existsSync(file) ? readFileSync(file, 'utf8') : null;
const result = addLesson(before, lesson, { pr: process.env.PR_NUMBER, path: process.env.COMMENT_PATH });

if (result.added) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, result.text);
  console.log(`Added lesson ${result.count}: ${lesson}`);
} else {
  console.log(`Not added (${result.reason}): ${lesson}`);
}
out('added', result.added);
out('lesson', lesson);
out('reason', result.reason ?? '');
out('count', result.count);
