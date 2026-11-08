/**
 * The agent run lifecycle as an XState v5 statechart.
 *
 * It encodes the rules from the agent instructions as states and guards, so they are
 * enforced and visible rather than buried in prose:
 *   - no coding before the Definition of Ready passes (readiness is scored on entry);
 *   - tests are written before implementation;
 *   - at most `maxFixAttempts` failed verification rounds, then a draft PR that explains
 *     the failure instead of an endless (and expensive) fix loop;
 *   - hard stops (new dependency, schema break, security change, scope too big) go back
 *     to a human via Jira;
 *   - review rounds are counted, so the dashboard can show rework per PR.
 *
 * Paste `storyToPrMachine.config` into https://stately.ai/viz to see the diagram.
 */
import { setup, assign } from 'xstate';
import { scoreStory } from '../readiness/score-story.js';

export const STAGES = ['readinessCheck', 'planning', 'testsFirst', 'implementing', 'verifying', 'openingPr'];

export const storyToPrMachine = setup({
  types: {
    /** @type {{storyKey:string, story:object|null, readiness:object|null, fixAttempts:number, maxFixAttempts:number, reviewRounds:number, failedChecks:boolean, prNumber:number|null, questions:string[], hardStopReason:string|null}} */
    context: {},
    events: {}
  },
  guards: {
    isReady: ({ context }) => Boolean(context.readiness?.ready),
    canRetry: ({ context }) => context.fixAttempts + 1 < context.maxFixAttempts
  },
  actions: {
    scoreReadiness: assign(({ context, event }) => {
      const story = event.story ?? context.story;
      const readiness = story ? scoreStory(story) : { ready: false, score: 0, checks: [], questions: ['No story was provided.'] };
      return {
        story,
        storyKey: story?.key ?? context.storyKey,
        readiness,
        questions: readiness.questions
      };
    }),
    recordQuestions: assign({
      questions: ({ event }) => event.questions ?? []
    }),
    recordHardStop: assign({
      hardStopReason: ({ event }) => event.reason ?? 'Unspecified',
      questions: ({ event }) => [`Agent stopped: ${event.reason ?? 'needs a human decision'}. How should it proceed?`]
    }),
    countFailedAttempt: assign({ fixAttempts: ({ context }) => context.fixAttempts + 1 }),
    markChecksFailed: assign({ failedChecks: true }),
    markChecksPassed: assign({ failedChecks: false }),
    recordPr: assign({ prNumber: ({ event }) => event.number ?? null }),
    countReviewRound: assign({ reviewRounds: ({ context }) => context.reviewRounds + 1, fixAttempts: 0 })
  }
}).createMachine({
  id: 'storyToPr',
  initial: 'idle',
  context: ({ input }) => ({
    storyKey: input?.storyKey ?? '',
    story: input?.story ?? null,
    readiness: null,
    fixAttempts: 0,
    maxFixAttempts: input?.maxFixAttempts ?? 3,
    reviewRounds: 0,
    failedChecks: false,
    prNumber: null,
    questions: [],
    hardStopReason: null
  }),
  states: {
    idle: {
      on: { START: { target: 'readinessCheck', actions: 'scoreReadiness' } }
    },
    readinessCheck: {
      always: [
        { guard: 'isReady', target: 'planning' },
        { target: 'needsInfo' }
      ]
    },
    needsInfo: {
      description: 'Questions are posted in Jira. Nothing is coded until the story is updated.',
      on: {
        STORY_UPDATED: { target: 'readinessCheck', actions: 'scoreReadiness' },
        DECISION_MADE: { target: 'planning' },
        CANCEL: 'cancelled'
      }
    },
    planning: {
      on: {
        PLAN_DONE: 'testsFirst',
        NEEDS_INFO: { target: 'needsInfo', actions: 'recordQuestions' },
        HARD_STOP: { target: 'needsInfo', actions: 'recordHardStop' }
      }
    },
    testsFirst: {
      description: 'Each acceptance criterion becomes at least one failing test.',
      on: {
        TESTS_WRITTEN: 'implementing',
        HARD_STOP: { target: 'needsInfo', actions: 'recordHardStop' }
      }
    },
    implementing: {
      on: {
        IMPLEMENTED: 'verifying',
        HARD_STOP: { target: 'needsInfo', actions: 'recordHardStop' }
      }
    },
    verifying: {
      description: 'npm run agent:check — lint, JSON schema, tests. Prints only failures.',
      on: {
        CHECKS_PASSED: { target: 'openingPr', actions: 'markChecksPassed' },
        CHECKS_FAILED: [
          { guard: 'canRetry', target: 'implementing', actions: 'countFailedAttempt' },
          { target: 'openingPr', actions: ['countFailedAttempt', 'markChecksFailed'] }
        ]
      }
    },
    openingPr: {
      description: 'Draft PR with the AC → evidence table. If checks still fail, the PR explains why.',
      on: { PR_OPENED: { target: 'inReview', actions: 'recordPr' } }
    },
    inReview: {
      on: {
        CHANGES_REQUESTED: { target: 'implementing', actions: 'countReviewRound' },
        MERGED: 'merged',
        CLOSED: 'closed'
      }
    },
    merged: { type: 'final' },
    closed: { type: 'final' },
    cancelled: { type: 'final' }
  }
});

/** Outcome label used by the metrics dashboard. */
export function outcomeOf(snapshot) {
  const { value, context } = snapshot;
  if (value === 'merged') return context.reviewRounds === 0 ? 'merged-as-is' : 'merged-after-changes';
  if (value === 'closed') return 'closed-without-merge';
  if (value === 'cancelled') return 'cancelled';
  return 'in-progress';
}
