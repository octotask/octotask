import { describe, expect, it, beforeEach } from 'vitest';
import { FlowStore } from './Memory';
import { PromptFactory } from './PromptFactory';

describe('Flow Consistency Tests', () => {
  let flowStore: FlowStore;
  let promptFactory: PromptFactory;

  beforeEach(() => {
    flowStore = new FlowStore();
    promptFactory = new PromptFactory();
  });

  describe('User Correction Handling', () => {
    it('should preserve both original assumption and user correction in Flow', () => {
      // Agent makes assumption A
      const actionEntry = flowStore.append({
        type: 'action',
        surface: 'editor',
        content: { tool: 'write_file', args: { path: 'auth.ts', approach: 'sessions' } },
      });

      flowStore.append({
        type: 'observation',
        surface: 'editor',
        content: 'File written with session-based auth',
        causedBy: [actionEntry.id],
      });

      // User corrects assumption
      flowStore.append({
        type: 'human_intervention',
        surface: 'editor',
        content: 'Use JWT instead of sessions',
      });

      // Verify both are in Flow
      const flow = flowStore.getWindow();
      expect(flow).toHaveLength(3);
      expect(flow[0].type).toBe('action');
      expect(flow[1].type).toBe('observation');
      expect(flow[2].type).toBe('human_intervention');
      expect(flow[2].content).toBe('Use JWT instead of sessions');
    });

    it('should highlight user correction in Engineering Tension', () => {
      // Setup: Agent action + User correction
      flowStore.append({
        type: 'action',
        surface: 'editor',
        content: { tool: 'write_file', approach: 'sessions' },
      });

      flowStore.append({
        type: 'human_intervention',
        surface: 'editor',
        content: 'Use JWT instead of sessions',
      });

      // Generate flow-aware prompt
      const prompt = promptFactory.generateFlowAwarePrompt('Implement auth', '', flowStore.getWindow());

      // Verify tension is highlighted
      expect(prompt).toContain('CURRENT ENGINEERING TENSION');
      expect(prompt).toContain('User corrected approach mid-task');
      expect(prompt).toContain('Use JWT instead of sessions');
    });

    it('should NOT reintroduce invalidated assumption after correction', () => {
      // This is a behavioral test - verifies the prompt structure supports this
      flowStore.append({
        type: 'action',
        surface: 'editor',
        content: { tool: 'write_file', approach: 'sessions' },
      });

      flowStore.append({
        type: 'human_intervention',
        surface: 'editor',
        content: 'Use JWT instead of sessions',
      });

      const prompt = promptFactory.generateFlowAwarePrompt('Implement auth', '', flowStore.getWindow());

      // The prompt should contain the correction prominently
      expect(prompt).toContain('Use JWT instead of sessions');

      // And it should be in the tension section (higher visibility)
      const tensionIndex = prompt.indexOf('CURRENT ENGINEERING TENSION');
      const correctionIndex = prompt.indexOf('Use JWT instead of sessions');
      expect(tensionIndex).toBeLessThan(correctionIndex);
      expect(tensionIndex).toBeGreaterThan(-1);
    });
  });

  describe('Causality Tracking', () => {
    it('should link observations to their triggering actions', () => {
      const actionEntry = flowStore.append({
        type: 'action',
        surface: 'terminal',
        content: { tool: 'run_command', args: { command: 'npm test' } },
      });

      const observationEntry = flowStore.append({
        type: 'observation',
        surface: 'terminal',
        content: 'Tests passed',
        causedBy: [actionEntry.id],
      });

      expect(observationEntry.causedBy).toEqual([actionEntry.id]);

      // Verify we can trace back
      const action = flowStore.getById(observationEntry.causedBy![0]);
      expect(action).toBeDefined();
      expect(action?.type).toBe('action');
      expect(action?.content.tool).toBe('run_command');
    });

    it('should support multiple causal links', () => {
      const action1 = flowStore.append({
        type: 'action',
        surface: 'editor',
        content: { tool: 'write_file', path: 'auth.ts' },
      });

      const action2 = flowStore.append({
        type: 'action',
        surface: 'editor',
        content: { tool: 'write_file', path: 'user.ts' },
      });

      const observation = flowStore.append({
        type: 'observation',
        surface: 'test',
        content: 'Integration test failed',
        causedBy: [action1.id, action2.id],
      });

      expect(observation.causedBy).toHaveLength(2);
      expect(observation.causedBy).toContain(action1.id);
      expect(observation.causedBy).toContain(action2.id);
    });

    it('should track affected files/modules', () => {
      const entry = flowStore.append({
        type: 'action',
        surface: 'editor',
        content: { tool: 'write_file', path: 'auth.ts' },
        affects: ['auth.ts', 'auth.test.ts', 'user.ts'],
      });

      expect(entry.affects).toEqual(['auth.ts', 'auth.test.ts', 'user.ts']);
    });
  });

  describe('Semantic Pruning', () => {
    it('should truncate long observations', () => {
      const longContent = 'x'.repeat(1000);

      flowStore.append({
        type: 'observation',
        surface: 'terminal',
        content: longContent,
      });

      const prompt = promptFactory.generateFlowAwarePrompt('Test goal', '', flowStore.getWindow());

      // Should be truncated in the narrative
      expect(prompt).toContain('(Truncated)');
      expect(prompt).not.toContain(longContent);
    });

    it('should preserve human interventions without truncation', () => {
      const humanInput = 'This is a critical user correction that must be preserved in full';

      flowStore.append({
        type: 'human_intervention',
        surface: 'editor',
        content: humanInput,
      });

      const prompt = promptFactory.generateFlowAwarePrompt('Test goal', '', flowStore.getWindow());

      // Human interventions should appear in full
      expect(prompt).toContain(humanInput);
      expect(prompt).not.toContain('(Truncated)');
    });

    it('should keep decision points (actions) without truncation', () => {
      const actionContent = { tool: 'write_file', path: 'important.ts', reason: 'Critical refactor' };

      flowStore.append({
        type: 'action',
        surface: 'editor',
        content: actionContent,
      });

      const prompt = promptFactory.generateFlowAwarePrompt('Test goal', '', flowStore.getWindow());

      // Actions should be preserved
      expect(prompt).toContain('write_file');
      expect(prompt).toContain('important.ts');
    });
  });

  describe('Engineering Tension Detection', () => {
    it('should detect failing tests', () => {
      flowStore.append({
        type: 'observation',
        surface: 'test',
        content: 'Test suite failed: 3 tests failing',
      });

      const prompt = promptFactory.generateFlowAwarePrompt('Fix tests', '', flowStore.getWindow());

      expect(prompt).toContain('CURRENT ENGINEERING TENSION');
      expect(prompt).toContain('Tests failing after recent changes');
    });

    it('should not show tension when no issues exist', () => {
      flowStore.append({
        type: 'action',
        surface: 'editor',
        content: { tool: 'write_file' },
      });

      flowStore.append({
        type: 'observation',
        surface: 'editor',
        content: 'File written successfully',
      });

      const prompt = promptFactory.generateFlowAwarePrompt('Write file', '', flowStore.getWindow());

      // No tension should be present
      expect(prompt).not.toContain('CURRENT ENGINEERING TENSION');
    });
  });

  describe('FlowStore Operations', () => {
    it('should auto-generate unique IDs', () => {
      const entry1 = flowStore.append({
        type: 'action',
        surface: 'editor',
        content: {},
      });

      const entry2 = flowStore.append({
        type: 'action',
        surface: 'editor',
        content: {},
      });

      expect(entry1.id).toBeDefined();
      expect(entry2.id).toBeDefined();
      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should support filtering with getWindow', () => {
      flowStore.append({ type: 'action', surface: 'editor', content: {} });
      flowStore.append({ type: 'observation', surface: 'terminal', content: {} });
      flowStore.append({ type: 'human_intervention', surface: 'editor', content: {} });

      const humanInterventions = flowStore.getWindow((e) => e.type === 'human_intervention');

      expect(humanInterventions).toHaveLength(1);
      expect(humanInterventions[0].type).toBe('human_intervention');
    });

    it('should retrieve entries by ID', () => {
      const entry = flowStore.append({
        type: 'action',
        surface: 'editor',
        content: { tool: 'test_tool' },
      });

      const retrieved = flowStore.getById(entry.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(entry.id);
      expect(retrieved?.content.tool).toBe('test_tool');
    });

    it('should clear flow when requested', () => {
      flowStore.append({ type: 'action', surface: 'editor', content: {} });
      flowStore.append({ type: 'observation', surface: 'terminal', content: {} });

      expect(flowStore.getWindow()).toHaveLength(2);

      flowStore.clear();

      expect(flowStore.getWindow()).toHaveLength(0);
    });
  });
});
