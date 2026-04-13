import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IncidentTimeline } from '../src/incident-timeline';
import { TimelineEntry } from '../src/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Incident Timeline', () => {
  let timeline: IncidentTimeline;
  const incidentId = 'inc-001';
  const tempDir = path.join(process.cwd(), '.test-timeline');

  beforeEach(() => {
    timeline = new IncidentTimeline(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('recordAction', () => {
    it('should record action to timeline', () => {
      const entry = timeline.recordAction(incidentId, 'incident_created');
      expect(entry).toBeDefined();
      expect(entry.action).toBe('incident_created');
    });

    it('should include timestamp', () => {
      const before = new Date();
      const entry = timeline.recordAction(incidentId, 'test_action');
      const after = new Date();
      expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should support optional actor and details', () => {
      const entry = timeline.recordAction(incidentId, 'summary_generated', 'summarizer', { summary: 'test' });
      expect(entry.actor).toBe('summarizer');
      expect(entry.details).toEqual({ summary: 'test' });
    });
  });

  describe('append-only log', () => {
    it('should maintain append-only log', () => {
      timeline.recordAction(incidentId, 'action1');
      timeline.recordAction(incidentId, 'action2');
      timeline.recordAction(incidentId, 'action3');
      const entries = timeline.getTimeline(incidentId);
      expect(entries).toHaveLength(3);
    });

    it('should order entries by timestamp', () => {
      timeline.recordAction(incidentId, 'first');
      timeline.recordAction(incidentId, 'second');
      const entries = timeline.getTimeline(incidentId);
      expect(entries[0].timestamp.getTime()).toBeLessThanOrEqual(entries[1].timestamp.getTime());
    });

    it('should be immutable', () => {
      timeline.recordAction(incidentId, 'action1');
      const entries = timeline.getTimeline(incidentId);
      entries.push({ timestamp: new Date(), action: 'injected', details: {} });
      // Original should not be affected
      expect(timeline.getTimeline(incidentId)).toHaveLength(1);
    });
  });

  describe('getTimeline', () => {
    it('should return timeline entries for incident', () => {
      timeline.recordAction(incidentId, 'test');
      const entries = timeline.getTimeline(incidentId);
      expect(entries).toHaveLength(1);
      expect(entries[0].action).toBe('test');
    });

    it('should return empty array for unknown incident', () => {
      expect(timeline.getTimeline('unknown')).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('should persist timeline to .squad/incidents/', async () => {
      timeline.recordAction(incidentId, 'test_action');
      await timeline.persistTimeline(incidentId);
      const filePath = path.join(tempDir, `${incidentId}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should load timeline from file', async () => {
      timeline.recordAction(incidentId, 'test_action');
      await timeline.persistTimeline(incidentId);

      const newTimeline = new IncidentTimeline(tempDir);
      const loaded = await newTimeline.loadTimeline(incidentId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].action).toBe('test_action');
      expect(loaded[0].timestamp).toBeInstanceOf(Date);
    });
  });
});
