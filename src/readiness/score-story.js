/**
 * Zero-token Definition of Ready check.
 *
 * Runs BEFORE a story is assigned to the agent. It is deterministic and free: a vague
 * story is caught here in milliseconds, instead of costing a full agent session and a
 * rejected PR. Failing checks come with the exact questions to post back in Jira.
 */

const VAGUE_TERMS = [
  'faster', 'better', 'improve', 'improved', 'user-friendly', 'intuitive', 'nice',
  'modern', 'clean up', 'optimi', 'robust', 'seamless', 'as needed', 'etc', 'and so on',
  'appropriate', 'properly', 'easy'
];

const UI_HINTS = /\b(screen|ui|lwc|component|layout|render|renderer|json|page|section|field|button|form)\b/i;

const MULTI_REPO = /(\+|,|\band\b|&)/i;

function isTestable(ac) {
  const text = ac.toLowerCase();
  const gwt = /\bgiven\b[\s\S]*\bthen\b/.test(text) || /\bwhen\b[\s\S]*\bthen\b/.test(text);
  return gwt;
}

const VAGUE_PATTERNS = VAGUE_TERMS.map((term) => ({
  term,
  // 'optimi' is a stem (optimise/optimize/optimisation); every other term is a whole word.
  re: new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${term === 'optimi' ? '' : '\\b'}`, 'i')
}));

function vagueIn(text) {
  return VAGUE_PATTERNS.filter(({ re }) => re.test(text)).map(({ term }) => term);
}

function validJson(text) {
  if (!text) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {object} story  Output of parseStoryMarkdown, or the same shape built from Jira fields.
 * @param {object} [opts]
 * @param {number} [opts.minTestableRatio=0.7]  Share of ACs that must be Given/When/Then.
 * @returns {{ready:boolean, score:number, checks:Array, questions:string[]}}
 */
export function scoreStory(story, opts = {}) {
  const minRatio = opts.minTestableRatio ?? 0.7;
  const acs = story.acceptanceCriteria ?? [];
  const testable = acs.filter(isTestable);
  const vague = [...new Set(acs.flatMap(vagueIn))];
  const repo = (story.repository ?? '').trim();
  const needsJson = UI_HINTS.test(`${story.changeType} ${story.component} ${story.title} ${story.userStory}`)
    && !/apex|backend|api/i.test(story.changeType ?? '');

  const checks = [
    {
      id: 'repository',
      label: 'One repository named',
      ok: repo.length > 0 && !MULTI_REPO.test(repo),
      detail: !repo ? 'No repository given.' : (MULTI_REPO.test(repo) ? `Spans several repositories: ${repo}` : repo),
      question: !repo
        ? 'Which single repository should this change go into?'
        : 'This story spans several repositories. Can it be split into one story per repository, with the dependency order noted?'
    },
    {
      id: 'acceptance-criteria',
      label: 'Testable acceptance criteria',
      ok: acs.length > 0 && testable.length / acs.length >= minRatio && vague.length === 0,
      detail: acs.length === 0
        ? 'No acceptance criteria.'
        : `${testable.length}/${acs.length} written as Given/When/Then${vague.length ? `; vague terms: ${vague.join(', ')}` : ''}`,
      question: acs.length === 0
        ? 'Can you add acceptance criteria as Given / When / Then, including at least one negative case?'
        : (vague.length
          ? `Can you make these terms measurable: ${vague.map((v) => `"${v}"`).join(', ')}? For example a number, a threshold or an observable result.`
          : 'Can every acceptance criterion be written as Given / When / Then, so it maps to a test?')
    },
    {
      id: 'sample-json',
      label: 'Sample JSON for UI changes',
      ok: !needsJson || validJson(story.sampleJson),
      detail: !needsJson ? 'Not a UI or renderer change.' : (story.sampleJson ? (validJson(story.sampleJson) ? 'Valid JSON attached.' : 'Attached, but it is not valid JSON.') : 'Missing.'),
      question: story.sampleJson
        ? 'The sample JSON does not parse. Can you attach a valid example config?'
        : 'This changes a screen. Can you attach the sample JSON config (input) and the expected rendered result?'
    },
    {
      id: 'pattern',
      label: 'Existing pattern to follow',
      ok: (story.pattern ?? '').replace(/<.*?>/g, '').trim().length > 3,
      detail: story.pattern || 'Not named.',
      question: 'Which existing feature, component or config should the agent copy as its pattern?'
    }
  ];

  const passed = checks.filter((c) => c.ok).length;
  return {
    ready: passed === checks.length,
    score: Math.round((passed / checks.length) * 100),
    checks: checks.map(({ question, ...c }) => c),
    questions: checks.filter((c) => !c.ok).map((c) => c.question)
  };
}
