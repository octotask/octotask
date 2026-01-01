import { EventEmitter } from 'events';

export interface TestResult {
  id: string;
  timestamp: number;
  command: string;
  status: 'passed' | 'failed' | 'running';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failedTestNames?: string[];
  duration?: number;
  output?: string;
  relatedFiles?: string[]; // Files that were changed before this test run
}

export interface TestFailureAnalysis {
  testName: string;
  possibleCauses: string[]; // FlowEntry IDs that might have caused this
  affectedFiles: string[];
}

/**
 * TestSurface - Dedicated component for test execution tracking and correlation
 *
 * Purpose:
 * - Track test execution results over time
 * - Correlate test failures with recent code changes
 * - Provide structured test data for Flow and Engineering Tension
 */
export class TestSurface extends EventEmitter {
  private _testHistory: TestResult[] = [];
  private _currentTest: TestResult | null = null;

  /**
   * Start tracking a new test run
   */
  startTest(command: string, relatedFiles?: string[]): TestResult {
    const testResult: TestResult = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
      command,
      status: 'running',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      relatedFiles,
    };

    this._currentTest = testResult;
    this._testHistory.push(testResult);
    this.emit('test:started', testResult);

    return testResult;
  }

  /**
   * Update the current test run with results
   */
  updateTest(update: Partial<TestResult>): void {
    if (!this._currentTest) {
      throw new Error('No active test to update');
    }

    Object.assign(this._currentTest, update);
    this.emit('test:updated', this._currentTest);
  }

  /**
   * Complete the current test run
   */
  completeTest(finalUpdate: Partial<TestResult>): TestResult {
    if (!this._currentTest) {
      throw new Error('No active test to complete');
    }

    Object.assign(this._currentTest, finalUpdate);

    if (this._currentTest.status === 'running') {
      this._currentTest.status = this._currentTest.failedTests > 0 ? 'failed' : 'passed';
    }

    const completedTest = this._currentTest;
    this._currentTest = null;

    this.emit('test:completed', completedTest);

    return completedTest;
  }

  /**
   * Parse test output and extract structured information
   */
  parseTestOutput(output: string): Partial<TestResult> {
    const result: Partial<TestResult> = {
      output,
    };

    // Parse Vitest output format
    const testsMatch = output.match(/Tests\s+(\d+)\s+passed/);
    const failedMatch = output.match(/Tests\s+(\d+)\s+failed/);
    const durationMatch = output.match(/Duration\s+([\d.]+)s/);

    if (testsMatch) {
      result.passedTests = parseInt(testsMatch[1], 10);
      result.totalTests = result.passedTests;
    }

    if (failedMatch) {
      result.failedTests = parseInt(failedMatch[1], 10);
      result.totalTests = (result.passedTests || 0) + result.failedTests;
    }

    if (durationMatch) {
      result.duration = parseFloat(durationMatch[1]);
    }

    // Extract failed test names
    const failedTestNames: string[] = [];
    const failedTestRegex = /❌\s+(.+?)(?:\n|$)/g;
    let match;

    while ((match = failedTestRegex.exec(output)) !== null) {
      failedTestNames.push(match[1].trim());
    }

    if (failedTestNames.length > 0) {
      result.failedTestNames = failedTestNames;
    }

    return result;
  }

  /**
   * Analyze test failures and correlate with recent Flow events
   */
  analyzeFailures(flowEntries: any[]): TestFailureAnalysis[] {
    const lastTest = this.getLastTest();

    if (!lastTest || lastTest.status !== 'failed' || !lastTest.failedTestNames) {
      return [];
    }

    const analyses: TestFailureAnalysis[] = [];

    // Find recent file changes (actions on 'editor' surface)
    const recentChanges = flowEntries.filter((e) => e.type === 'action' && e.surface === 'editor').slice(-10); // Last 10 file changes

    for (const testName of lastTest.failedTestNames) {
      const analysis: TestFailureAnalysis = {
        testName,
        possibleCauses: [],
        affectedFiles: [],
      };

      // Correlate with recent changes
      for (const change of recentChanges) {
        if (change.affects) {
          analysis.affectedFiles.push(...change.affects);
        }

        if (change.content?.args?.path) {
          analysis.affectedFiles.push(change.content.args.path);
        }

        analysis.possibleCauses.push(change.id);
      }

      // Deduplicate
      analysis.affectedFiles = [...new Set(analysis.affectedFiles)];

      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Get the last test result
   */
  getLastTest(): TestResult | null {
    return this._testHistory.length > 0 ? this._testHistory[this._testHistory.length - 1] : null;
  }

  /**
   * Get test history
   */
  getHistory(limit?: number): TestResult[] {
    if (limit) {
      return this._testHistory.slice(-limit);
    }

    return this._testHistory;
  }

  /**
   * Get current running test
   */
  getCurrentTest(): TestResult | null {
    return this._currentTest;
  }

  /**
   * Check if tests are currently running
   */
  isRunning(): boolean {
    return this._currentTest !== null;
  }

  /**
   * Get summary for Engineering Tension
   */
  getTensionSummary(): string | null {
    const lastTest = this.getLastTest();

    if (!lastTest || lastTest.status !== 'failed') {
      return null;
    }

    const failedCount = lastTest.failedTests;
    const failedNames = lastTest.failedTestNames?.slice(0, 3).join(', ') || 'unknown tests';

    return `${failedCount} test(s) failing: ${failedNames}${lastTest.failedTestNames && lastTest.failedTestNames.length > 3 ? '...' : ''}`;
  }

  /**
   * Clear test history
   */
  clear(): void {
    this._testHistory = [];
    this._currentTest = null;
  }
}
