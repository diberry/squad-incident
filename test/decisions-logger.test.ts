import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionsLogger } from '../src/decisions-logger';
import { Decision } from '../src/types';

describe('Decisions Logger', () => {
  let logger: DecisionsLogger;
  const incidentId = 'inc-001';

  beforeEach(() => {
    logger = new DecisionsLogger();
  });

  describe('recordDecision', () => {
    it('should log key decisions', () => {
      const decision = logger.recordDecision(incidentId, 'approved_fix', { reason: 'safe change' });
      expect(decision).toBeDefined();
      expect(decision.decision_type).toBe('approved_fix');
      expect(decision.context).toEqual({ reason: 'safe change' });
    });

    it('should include timestamp', () => {
      const before = new Date();
      const decision = logger.recordDecision(incidentId, 'test', {});
      expect(decision.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should support optional maker attribution', () => {
      const decision = logger.recordDecision(incidentId, 'escalated', { reason: 'critical' }, 'alice');
      expect(decision.made_by).toBe('alice');
    });
  });

  describe('getDecisions', () => {
    it('should return decisions for incident', () => {
      logger.recordDecision(incidentId, 'decision1', { a: 1 });
      logger.recordDecision(incidentId, 'decision2', { b: 2 });
      const decisions = logger.getDecisions(incidentId);
      expect(decisions).toHaveLength(2);
    });

    it('should return empty array for unknown incident', () => {
      expect(logger.getDecisions('unknown')).toEqual([]);
    });
  });

  describe('linkToTimeline', () => {
    it('should link decision to timeline event', () => {
      const decision = logger.recordDecision(incidentId, 'test', { x: 1 });
      logger.linkToTimeline(decision, 'timeline-entry-001');
      expect(decision.context).toHaveProperty('timeline_entry_id', 'timeline-entry-001');
    });

    it('should maintain decision-timeline relationship', () => {
      const d1 = logger.recordDecision(incidentId, 'test', {});
      logger.linkToTimeline(d1, 'tl-001');
      const withContext = logger.getDecisionsWithContext(incidentId);
      const enriched = withContext.get(d1.id);
      expect(enriched).toBeDefined();
      expect(enriched!.context).toHaveProperty('timeline_entry_id', 'tl-001');
    });
  });

  describe('getDecisionsWithContext', () => {
    it('should return decisions with full context', () => {
      logger.recordDecision(incidentId, 'fix_approved', { pr: '#42' });
      const withContext = logger.getDecisionsWithContext(incidentId);
      expect(withContext.size).toBe(1);
    });

    it('should support context lookups by decision type', () => {
      logger.recordDecision(incidentId, 'fix_approved', { pr: '#42' });
      logger.recordDecision(incidentId, 'escalated', { to: 'oncall' });
      const withContext = logger.getDecisionsWithContext(incidentId);
      const decisions = Array.from(withContext.values());
      const approved = decisions.find(d => d.decision_type === 'fix_approved');
      expect(approved).toBeDefined();
      expect(approved!.context).toEqual({ pr: '#42' });
    });
  });
});
