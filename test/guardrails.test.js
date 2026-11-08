import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkPr, toMarkdown } from '../src/guardrails/check-pr.js';
import { globToRegExp } from '../src/guardrails/glob.js';

const pr = (name) => JSON.parse(readFileSync(new URL(`../examples/prs/${name}`, import.meta.url), 'utf8'));
const ids = (r) => r.findings.map((f) => f.id);

test('glob matching', () => {
  assert.ok(globToRegExp('**/package.json').test('package.json'));
  assert.ok(globToRegExp('**/package.json').test('apps/web/package.json'));
  assert.ok(globToRegExp('.github/workflows/**').test('.github/workflows/ci.yml'));
  assert.ok(globToRegExp('**/*Test.cls').test('force-app/main/default/classes/CaseServiceTest.cls'));
  assert.ok(!globToRegExp('**/*.test.js').test('src/case.js'));
});

test('a well-formed agent PR passes', () => {
  const r = checkPr(pr('good-pr.json'));
  assert.equal(r.passed, true, JSON.stringify(r.findings, null, 2));
  assert.equal(r.errors, 0);
});

test('a PR that games the build is blocked, with every violation named', () => {
  const r = checkPr(pr('bad-pr.json'));
  assert.equal(r.passed, false);
  for (const id of ['title', 'sections', 'protected-paths', 'deleted-tests', 'skipped-tests', 'weakened-tests', 'dependencies']) {
    assert.ok(ids(r).includes(id), `expected finding "${id}" in ${ids(r).join(', ')}`);
  }
});

test('branch must carry the same Jira key as the title', () => {
  const good = pr('good-pr.json');
  const r = checkPr({ ...good, headRef: 'feature/PAY-9999-something-else' });
  assert.deepEqual(ids(r), ['branch']);
});

test('an empty AC → evidence table is an error', () => {
  const good = pr('good-pr.json');
  const body = good.body.replace(/\| 1 \|.*\n\| 2 \|.*\n\| 3 \|.*\n/, '');
  const r = checkPr({ ...good, body });
  assert.ok(ids(r).includes('ac-evidence'));
});

test('scope limit is configurable', () => {
  const r = checkPr(pr('good-pr.json'), { maxFiles: 2 });
  assert.deepEqual(ids(r), ['scope']);
});

test('markdown report lists findings and carries a marker for comment updates', () => {
  const md = toMarkdown(checkPr(pr('bad-pr.json')), { prNumber: 12 });
  assert.match(md, /<!-- story-to-pr-guardrails pr=12 -->/);
  assert.match(md, /deleted-tests/);
});
