#!/usr/bin/env node
/**
 * Two modes:
 *   Local:   agent-pr-guard --pr examples/prs/bad-pr.json [--config .github/story-to-pr.json]
 *   Actions: agent-pr-guard        (reads the pull_request event and the PR's files via the REST API)
 *
 * Env (Actions mode): GITHUB_TOKEN, GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_API_URL,
 *   AGENT_LOGINS (optional, comma list — only check PRs from these authors),
 *   STORY_TO_PR_CONFIG (optional path, default .github/story-to-pr.json),
 *   REPORT_PATH (optional, default story-to-pr-report.md).
 * Exit code 1 when there are errors.
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { checkPr, toMarkdown } from './check-pr.js';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

function loadConfig() {
  const path = opt('--config') ?? process.env.STORY_TO_PR_CONFIG ?? '.github/story-to-pr.json';
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
}

async function fetchFiles(repo, number) {
  const api = process.env.GITHUB_API_URL ?? 'https://api.github.com';
  const files = [];
  for (let page = 1; page <= 30; page++) {
    const res = await fetch(`${api}/repos/${repo}/pulls/${number}/files?per_page=100&page=${page}`, {
      headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    files.push(...batch.map((f) => ({ filename: f.filename, status: f.status, patch: f.patch ?? '' })));
    if (batch.length < 100) break;
  }
  return files;
}

async function loadPr() {
  const local = opt('--pr');
  if (local) return { pr: JSON.parse(readFileSync(local, 'utf8')), number: undefined };

  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const p = event.pull_request;
  if (!p) throw new Error('No pull_request in the event payload.');
  const logins = (process.env.AGENT_LOGINS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (logins.length && !logins.includes(p.user.login.toLowerCase())) {
    console.log(`Skipping: PR author ${p.user.login} is not in AGENT_LOGINS.`);
    process.exit(0);
  }
  const files = await fetchFiles(process.env.GITHUB_REPOSITORY, p.number);
  return { pr: { title: p.title, body: p.body ?? '', headRef: p.head.ref, files }, number: p.number };
}

const { pr, number } = await loadPr();
const result = checkPr(pr, loadConfig());
const md = toMarkdown(result, { prNumber: number });

console.log(md);
writeFileSync(process.env.REPORT_PATH ?? 'story-to-pr-report.md', md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `passed=${result.passed}\nerrors=${result.errors}\n`);
process.exit(result.passed ? 0 : 1);
