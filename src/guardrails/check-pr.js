/**
 * Deterministic guardrails for pull requests opened by the coding agent.
 *
 * The agent is TOLD the rules in its instructions. This check ENFORCES them, for free,
 * on every push: traceability to Jira, the PR contract, scope limits, protected paths,
 * and — most important — that tests were not deleted, skipped or weakened to go green.
 */
import { matchesAny } from './glob.js';

export const DEFAULT_CONFIG = {
  maxFiles: 15,
  jiraKeyPattern: '[A-Z][A-Z0-9]+-\\d+',
  branchPattern: '^(feature|bugfix|chore)/{KEY}-[a-z0-9-]+$',
  requiredSections: [
    'Summary',
    'Acceptance criteria → evidence',
    'Pattern followed',
    'Assumptions',
    'Cross-repo dependencies',
    'Risks and reviewer focus',
    'Not done'
  ],
  protectedPaths: [
    '.github/workflows/**',
    '**/permissionsets/**',
    '**/profiles/**',
    '**/sharingRules/**',
    '**/*.permissionset-meta.xml'
  ],
  testFilePatterns: ['**/*.test.js', '**/*.spec.js', '**/__tests__/**', '**/*Test.cls', '**/*Tests.cls', '**/test/**', '**/tests/**'],
  dependencyFiles: ['package.json', '**/package.json', 'pom.xml', '**/pom.xml', 'build.gradle', 'requirements.txt', 'sfdx-project.json']
};

const SKIP_MARKERS = [
  /\b(it|test|describe)\.skip\s*\(/,
  /\bx(it|describe|test)\s*\(/,
  /\b(it|test|describe)\.only\s*\(/,
  /@Ignore\b/,
  /SeeAllData\s*=\s*true/i,
  /--passWithNoTests/,
  /eslint-disable/
];

const ASSERTION = /\b(expect\s*\(|assert(\.\w+)?\s*\(|Assert\.\w+\s*\(|System\.assert\w*\s*\(|toBe\w*\s*\()/;

function addedLines(patch = '') {
  return patch.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
}

function removedLines(patch = '') {
  return patch.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1));
}

function sectionText(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/**
 * @param {{title:string, body:string, headRef:string, files:Array<{filename:string,status:string,patch?:string}>}} pr
 * @param {object} [userConfig]
 * @returns {{passed:boolean, errors:number, warnings:number, findings:Array<{id:string,severity:'error'|'warning',message:string}>}}
 */
export function checkPr(pr, userConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...userConfig };
  const findings = [];
  const add = (id, severity, message) => findings.push({ id, severity, message });
  const body = pr.body ?? '';
  const files = pr.files ?? [];

  // 1. Traceability
  const keyRe = new RegExp(`^(${cfg.jiraKeyPattern}):\\s+\\S`);
  const key = (pr.title ?? '').match(keyRe)?.[1];
  if (!key) {
    add('title', 'error', 'PR title must start with the Jira key, e.g. "PAY-123: Add contact time field".');
  } else {
    const branchRe = new RegExp(cfg.branchPattern.replace('{KEY}', key));
    if (!branchRe.test(pr.headRef ?? '')) {
      add('branch', 'error', `Branch "${pr.headRef}" should match ${cfg.branchPattern.replace('{KEY}', key)}.`);
    }
  }

  // 2. PR contract
  const missing = cfg.requiredSections.filter((s) => !sectionText(body, s) && !new RegExp(`^##\\s+${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'mi').test(body));
  if (missing.length) add('sections', 'error', `PR description is missing sections: ${missing.join(', ')}.`);

  const acTable = sectionText(body, 'Acceptance criteria → evidence');
  const rows = acTable.split('\n').filter((l) => l.trim().startsWith('|'));
  const dataRows = rows.filter((l) => !/^\|\s*:?-{2,}/.test(l.trim())).slice(1);
  if (!missing.includes('Acceptance criteria → evidence') && dataRows.length === 0) {
    add('ac-evidence', 'error', 'The "Acceptance criteria → evidence" table has no rows. Map every AC to a test.');
  }

  // 3. Scope
  if (files.length > cfg.maxFiles) {
    add('scope', 'error', `${files.length} files changed (limit ${cfg.maxFiles}). Split the story or ask for approval.`);
  }
  const touchedProtected = files.filter((f) => matchesAny(f.filename, cfg.protectedPaths)).map((f) => f.filename);
  if (touchedProtected.length) {
    add('protected-paths', 'error', `Protected paths changed (needs a human): ${touchedProtected.join(', ')}.`);
  }

  // 4. Test integrity
  const testFiles = files.filter((f) => matchesAny(f.filename, cfg.testFilePatterns));
  const deleted = testFiles.filter((f) => f.status === 'removed').map((f) => f.filename);
  if (deleted.length) add('deleted-tests', 'error', `Test files deleted: ${deleted.join(', ')}.`);

  for (const f of files) {
    const hits = addedLines(f.patch).filter((l) => SKIP_MARKERS.some((m) => m.test(l)));
    if (hits.length) {
      add('skipped-tests', 'error', `${f.filename} adds a skip/only/ignore or lint bypass: "${hits[0].trim().slice(0, 80)}".`);
    }
  }

  for (const f of testFiles.filter((t) => t.status !== 'removed')) {
    const removedAsserts = removedLines(f.patch).filter((l) => ASSERTION.test(l)).length;
    const addedAsserts = addedLines(f.patch).filter((l) => ASSERTION.test(l)).length;
    if (removedAsserts > addedAsserts) {
      add('weakened-tests', 'warning', `${f.filename} removes ${removedAsserts} assertion(s) and adds ${addedAsserts}. Check the tests were not weakened.`);
    }
  }
  if (testFiles.length === 0 && files.some((f) => /\.(js|ts|cls|java|py)$/.test(f.filename))) {
    add('no-tests', 'warning', 'Code changed but no test files changed. Each AC should map to a test.');
  }

  // 5. Dependencies
  for (const f of files.filter((x) => matchesAny(x.filename, cfg.dependencyFiles))) {
    const deps = addedLines(f.patch).filter((l) => /^\s*"[@\w./-]+"\s*:\s*"[\^~]?\d/.test(l) || /<artifactId>/.test(l) || /^[\w-]+==/.test(l));
    if (deps.length) add('dependencies', 'error', `${f.filename} adds or changes dependencies (needs approval): ${deps.map((d) => d.trim()).join(' ').slice(0, 120)}`);
  }

  const errors = findings.filter((f) => f.severity === 'error').length;
  return { passed: errors === 0, errors, warnings: findings.length - errors, findings };
}

export function toMarkdown(result, { prNumber } = {}) {
  const icon = { error: '❌', warning: '⚠️' };
  const head = result.passed
    ? `### ✅ Story-to-PR guardrails passed${result.warnings ? ` with ${result.warnings} warning(s)` : ''}`
    : `### ❌ Story-to-PR guardrails: ${result.errors} error(s), ${result.warnings} warning(s)`;
  const lines = [`<!-- story-to-pr-guardrails${prNumber ? ` pr=${prNumber}` : ''} -->`, head, ''];
  if (result.findings.length) {
    lines.push('| | Check | Finding |', '|---|---|---|');
    for (const f of result.findings) lines.push(`| ${icon[f.severity]} | \`${f.id}\` | ${f.message.replace(/\|/g, '\\|')} |`);
  } else {
    lines.push('Traceability, PR contract, scope, protected paths, test integrity and dependencies all look good.');
  }
  return lines.join('\n');
}
