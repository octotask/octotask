import type { FlowEntry } from '~/core/agent/Memory';
import type { PersistedSession } from '~/core/workspace/FlowPersistence';

/**
 * SWE-1 Evaluation Suite
 *
 * Purpose:
 * - Measure conversational SWE capabilities (mid-task resumption)
 * - Evaluate end-to-end task completion quality
 * - Track production metrics (contribution rate, task spans)
 */

export interface ConversationalEvalScenario {
  id: string;
  name: string;
  description: string;
  initialContext: {
    goal: string;
    partialFlow: FlowEntry[];
    incompleteTasks: string[];
  };
  expectedBehaviors: string[];
  evaluationCriteria: {
    correctnessContinuation: boolean;
    efficiencyNextSteps: boolean;
    intentAlignment: boolean;
    qualityAndSafety: boolean;
  };
}

export interface EndToEndEvalScenario {
  id: string;
  name: string;
  description: string;
  initialGoal: string;
  successCriteria: {
    planningQuality: string[];
    courseCorrection: string[];
    systemDesign: string[];
    maintainability: string[];
  };
}

export interface EvaluationResult {
  scenarioId: string;
  timestamp: number;
  passed: boolean;
  score: number; // 0-100
  details: {
    criterion: string;
    passed: boolean;
    notes?: string;
  }[];
  session?: PersistedSession;
}

export class SWE1Evaluator {
  /**
   * Conversational SWE Evaluation
   * Start the model mid-task with incomplete context
   */
  evaluateConversational(scenario: ConversationalEvalScenario, actualFlow: FlowEntry[]): EvaluationResult {
    const details: EvaluationResult['details'] = [];
    let totalScore = 0;
    const maxScore = 4; // 4 criteria

    // 1. Correctness of continuation
    const correctness = this._evaluateCorrectness(scenario, actualFlow);
    details.push({
      criterion: 'Correctness of Continuation',
      passed: correctness,
      notes: correctness ? 'Agent continued from partial state correctly' : 'Agent failed to resume properly',
    });

    if (correctness) {
      totalScore++;
    }

    // 2. Efficiency of next steps
    const efficiency = this._evaluateEfficiency(scenario, actualFlow);
    details.push({
      criterion: 'Efficiency of Next Steps',
      passed: efficiency,
      notes: efficiency ? 'Agent took efficient next steps' : 'Agent took unnecessary or redundant steps',
    });

    if (efficiency) {
      totalScore++;
    }

    // 3. Intent alignment
    const intentAlignment = this._evaluateIntentAlignment(scenario, actualFlow);
    details.push({
      criterion: 'Intent Alignment',
      passed: intentAlignment,
      notes: intentAlignment ? 'Agent understood and aligned with user intent' : 'Agent misunderstood user intent',
    });

    if (intentAlignment) {
      totalScore++;
    }

    // 4. Quality and safety
    const qualitySafety = this._evaluateQualitySafety(actualFlow);
    details.push({
      criterion: 'Quality and Safety',
      passed: qualitySafety,
      notes: qualitySafety ? 'Agent maintained code quality and safety' : 'Agent introduced quality or safety issues',
    });

    if (qualitySafety) {
      totalScore++;
    }

    const score = (totalScore / maxScore) * 100;
    const passed = score >= 75; // 75% threshold

    return {
      scenarioId: scenario.id,
      timestamp: Date.now(),
      passed,
      score,
      details,
    };
  }

  /**
   * End-to-End SWE Evaluation
   * Start from initial intent and evaluate the complete journey
   */
  evaluateEndToEnd(scenario: EndToEndEvalScenario, session: PersistedSession): EvaluationResult {
    const details: EvaluationResult['details'] = [];
    let totalScore = 0;
    const maxScore = 4; // 4 criteria categories

    // 1. Planning quality
    const planningScore = this._evaluatePlanningQuality(scenario, session);
    details.push({
      criterion: 'Planning Quality',
      passed: planningScore >= 0.7,
      notes: `Planning quality score: ${(planningScore * 100).toFixed(0)}%`,
    });

    if (planningScore >= 0.7) {
      totalScore++;
    }

    // 2. Course correction ability
    const courseCorrection = this._evaluateCourseCorrection(session);
    details.push({
      criterion: 'Course Correction',
      passed: courseCorrection,
      notes: courseCorrection ? 'Agent successfully corrected course when needed' : 'Agent failed to adapt',
    });

    if (courseCorrection) {
      totalScore++;
    }

    // 3. System design soundness
    const systemDesign = this._evaluateSystemDesign(scenario, session);
    details.push({
      criterion: 'System Design Soundness',
      passed: systemDesign >= 0.7,
      notes: `System design score: ${(systemDesign * 100).toFixed(0)}%`,
    });

    if (systemDesign >= 0.7) {
      totalScore++;
    }

    // 4. Long-term maintainability
    const maintainability = this._evaluateMaintainability(session);
    details.push({
      criterion: 'Long-term Maintainability',
      passed: maintainability,
      notes: maintainability ? 'Code is maintainable and follows best practices' : 'Code has maintainability issues',
    });

    if (maintainability) {
      totalScore++;
    }

    const score = (totalScore / maxScore) * 100;
    const passed = score >= 75; // 75% threshold

    return {
      scenarioId: scenario.id,
      timestamp: Date.now(),
      passed,
      score,
      details,
      session,
    };
  }

  // Private evaluation methods

  private _evaluateCorrectness(scenario: ConversationalEvalScenario, actualFlow: FlowEntry[]): boolean {
    // Check if agent continued from the partial state without restarting
    const firstAction = actualFlow.find((e) => e.type === 'action');

    if (!firstAction) {
      return false;
    }

    // Verify agent didn't repeat work from partial flow
    const partialActionIds = scenario.initialContext.partialFlow.filter((e) => e.type === 'action').map((e) => e.id);

    const repeatedWork = actualFlow.some(
      (e) => e.type === 'action' && partialActionIds.includes(e.id || '') && e.timestamp > firstAction.timestamp,
    );

    return !repeatedWork;
  }

  private _evaluateEfficiency(scenario: ConversationalEvalScenario, actualFlow: FlowEntry[]): boolean {
    // Check if agent took direct next steps without unnecessary exploration
    const actions = actualFlow.filter((e) => e.type === 'action');

    // Heuristic: efficient if < 5 actions to complete incomplete tasks
    return actions.length <= 5;
  }

  private _evaluateIntentAlignment(scenario: ConversationalEvalScenario, actualFlow: FlowEntry[]): boolean {
    // Check if agent's actions align with expected behaviors
    const actionContents = actualFlow.filter((e) => e.type === 'action').map((e) => JSON.stringify(e.content));

    // Simple heuristic: at least one expected behavior should be reflected
    return scenario.expectedBehaviors.some((behavior) =>
      actionContents.some((content) => content.toLowerCase().includes(behavior.toLowerCase())),
    );
  }

  private _evaluateQualitySafety(actualFlow: FlowEntry[]): boolean {
    // Check for destructive actions without confirmation
    const destructiveActions = actualFlow.filter(
      (e) =>
        e.type === 'action' &&
        (JSON.stringify(e.content).includes('delete') || JSON.stringify(e.content).includes('remove')),
    );

    // If there are destructive actions, they should have human intervention before
    if (destructiveActions.length > 0) {
      const hasConfirmation = actualFlow.some((e) => e.type === 'human_intervention');

      return hasConfirmation;
    }

    return true;
  }

  private _evaluatePlanningQuality(scenario: EndToEndEvalScenario, session: PersistedSession): number {
    const planningActions = session.flow.filter((e) => e.type === 'action' && e.surface === 'editor');

    // Check if planning criteria are met
    let metCriteria = 0;

    for (const criterion of scenario.successCriteria.planningQuality) {
      const criterionMet = planningActions.some((action) =>
        JSON.stringify(action.content).toLowerCase().includes(criterion.toLowerCase()),
      );

      if (criterionMet) {
        metCriteria++;
      }
    }

    return metCriteria / scenario.successCriteria.planningQuality.length;
  }

  private _evaluateCourseCorrection(session: PersistedSession): boolean {
    // Check if agent responded to human interventions
    const humanInterventions = session.flow.filter((e) => e.type === 'human_intervention');

    if (humanInterventions.length === 0) {
      return true; // No corrections needed
    }

    // Check if there are actions after each human intervention
    return humanInterventions.every((intervention) => {
      const actionsAfter = session.flow.filter((e) => e.type === 'action' && e.timestamp > intervention.timestamp);

      return actionsAfter.length > 0;
    });
  }

  private _evaluateSystemDesign(scenario: EndToEndEvalScenario, session: PersistedSession): number {
    const designActions = session.flow.filter((e) => e.type === 'action');

    // Check if system design criteria are met
    let metCriteria = 0;

    for (const criterion of scenario.successCriteria.systemDesign) {
      const criterionMet = designActions.some((action) =>
        JSON.stringify(action.content).toLowerCase().includes(criterion.toLowerCase()),
      );

      if (criterionMet) {
        metCriteria++;
      }
    }

    return metCriteria / scenario.successCriteria.systemDesign.length;
  }

  private _evaluateMaintainability(session: PersistedSession): boolean {
    // Heuristic: Check if code changes follow patterns (e.g., tests written, docs updated)
    const hasTests = session.flow.some(
      (e) => e.type === 'action' && JSON.stringify(e.content).toLowerCase().includes('test'),
    );

    const hasDocs = session.flow.some(
      (e) => e.type === 'action' && JSON.stringify(e.content).toLowerCase().includes('doc'),
    );

    return hasTests || hasDocs;
  }
}

// Example scenarios for testing

export const CONVERSATIONAL_SCENARIOS: ConversationalEvalScenario[] = [
  {
    id: 'conv_001',
    name: 'Mid-Task Refactor Resumption',
    description: 'Agent resumes a partially completed refactoring task',
    initialContext: {
      goal: 'Refactor authentication logic to use JWT',
      partialFlow: [
        {
          id: 'flow_1',
          type: 'action',
          surface: 'editor',
          content: { tool: 'write_file', path: 'auth.ts', approach: 'sessions' },
          timestamp: Date.now() - 10000,
        },
        {
          id: 'flow_2',
          type: 'human_intervention',
          surface: 'editor',
          content: 'Use JWT instead of sessions',
          timestamp: Date.now() - 5000,
        },
      ],
      incompleteTasks: ['Update auth.ts to use JWT', 'Update tests'],
    },
    expectedBehaviors: ['jwt', 'token', 'auth'],
    evaluationCriteria: {
      correctnessContinuation: true,
      efficiencyNextSteps: true,
      intentAlignment: true,
      qualityAndSafety: true,
    },
  },
];

export const END_TO_END_SCENARIOS: EndToEndEvalScenario[] = [
  {
    id: 'e2e_001',
    name: 'Complete Feature Implementation',
    description: 'Implement a new feature from scratch with tests and docs',
    initialGoal: 'Add user profile management feature',
    successCriteria: {
      planningQuality: ['user', 'profile', 'database'],
      courseCorrection: ['adapt', 'revise'],
      systemDesign: ['api', 'validation', 'security'],
      maintainability: ['test', 'documentation'],
    },
  },
];
