import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseStoryMarkdown } from '../src/readiness/parse-story.js';
import { scoreStory } from '../src/readiness/score-story.js';

const load = (name) => parseStoryMarkdown(readFileSync(new URL(`../examples/stories/${name}`, import.meta.url), 'utf8'));

test('parses the story template into fields', () => {
  const s = load('ready.md');
  assert.equal(s.key, 'PAY-1432');
  assert.equal(s.repository, 'acme/sf-service-console');
  assert.equal(s.acceptanceCriteria.length, 3);
  assert.match(s.sampleJson, /"type": "section"/);
  assert.match(s.pattern, /case360\.json/);
});

test('a complete story is ready, with no questions', () => {
  const r = scoreStory(load('ready.md'));
  assert.equal(r.ready, true);
  assert.equal(r.score, 100);
  assert.deepEqual(r.questions, []);
});

test('a vague multi-repo story is not ready and gets one question per gap', () => {
  const r = scoreStory(load('not-ready.md'));
  assert.equal(r.ready, false);
  assert.equal(r.score, 0);
  const failed = r.checks.filter((c) => !c.ok).map((c) => c.id);
  assert.deepEqual(failed, ['repository', 'acceptance-criteria', 'sample-json', 'pattern']);
  assert.equal(r.questions.length, 4);
  assert.match(r.questions[1], /"modern"|"user-friendly"|"faster"/);
});

test('vague terms match whole words only', () => {
  const r = scoreStory({
    repository: 'acme/case-api',
    changeType: 'API',
    acceptanceCriteria: ['Given a fetch request when the ID is unknown then return 404 and notice the caller'],
    pattern: 'CaseController.get'
  });
  assert.equal(r.ready, true, JSON.stringify(r.checks));
});

test('backend stories do not need sample JSON', () => {
  const r = scoreStory({
    repository: 'acme/case-api',
    changeType: 'API',
    title: 'Return 404 for unknown case',
    acceptanceCriteria: ['Given an unknown case ID when GET /cases/{id} is called then the API returns 404'],
    pattern: 'CaseController.get handler'
  });
  assert.equal(r.checks.find((c) => c.id === 'sample-json').ok, true);
});

test('invalid sample JSON is reported', () => {
  const r = scoreStory({
    repository: 'acme/sf-service-console',
    changeType: 'Config-only',
    title: 'Add field to section',
    acceptanceCriteria: ['Given a case when the section loads then the field shows'],
    sampleJson: '{ "type": "section", }',
    pattern: 'Phone field in case360.json'
  });
  const json = r.checks.find((c) => c.id === 'sample-json');
  assert.equal(json.ok, false);
  assert.match(json.detail, /not valid JSON/);
});
