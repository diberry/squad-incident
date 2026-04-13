import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PostMortemGenerator } from '../src/post-mortem-generator';
import { TimelineEntry, Decision, PostMortem } from '../src/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Post-Mortem Generator', () => {
  let generator: PostMortemGenerator;
  const incidentId = 'inc-001';
  const tempDir = path.join(process.cwd(), '.test-postmortem');
  let sampleTimeline: TimelineEntry[];
  let sampleDecisions: Decision[];

  beforeEach(() => {
    generator = new PostMortemGenerator(tempDir);
    const start = new Date('2024-04-12T10:00:00Z');
    const end = new Date('2024-04-12T10:45:00Z');
    sampleTimeline = [
      { timestamp: start, action: 'incident_created', actor: 'system', details: { severity: 'critical', description: 'DB CPU spike' } },
      { timestamp: new Date('2024-04-12T10:10:00Z'), action: 'summary_generated', actor: 'summarizer', details: {} },
      { timestamp: new Date('2024-04-12T10:30:00Z'), action: 'fix_drafted', actor: 'drafter', details: {} },
      { timestamp: end, action: 'resolution', actor: 'oncall', details: {} },
    ];
    sampleDecisions = [
      { id: 'dec-1', timestamp: new Date('2024-04-12T10:15:00Z'), decision_type: 'approved_fix', context: { reason: 'safe' }, made_by: 'alice' },
    ];
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generatePostMortem', () => {
    it('should generate post-mortem from timeline', async () => {
      const pm = await generator.generatePostMortem(incidentId, sampleTimeline, sampleDecisions);
      expect(pm).toBeDefined();
      expect(pm.incident_id).toBe(incidentId);
      expect(pm.timeline).toHaveLength(4);
    });

    it('should include incident summary, timeline, and decisions', async () => {
      const pm = await generator.generatePostMortem(incidentId, sampleTimeline, sampleDecisions);
      expect(pm.incident_summary).toBeDefined();
      expect(pm.timeline.length).toBeGreaterThan(0);
      expect(pm.decisions.length).toBeGreaterThan(0);
    });

    it('should include resolution and duration', async () => {
      const pm = await generator.generatePostMortem(incidentId, sampleTimeline, sampleDecisions);
      expect(pm.resolution).toBeTruthy();
      expect(pm.duration_minutes).toBe(45);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate incident duration', () => {
      const duration = generator.calculateDuration(sampleTimeline);
      expect(duration).toBe(45);
    });

    it('should handle single entry', () => {
      const duration = generator.calculateDuration([sampleTimeline[0]]);
      expect(duration).toBe(0);
    });
  });

  describe('formatAsMarkdown', () => {
    it('should format post-mortem as markdown', async () => {
      const pm = await generator.generatePostMortem(incidentId, sampleTimeline, sampleDecisions);
      const md = generator.formatAsMarkdown(pm);
      expect(md).toContain('# Post-Mortem');
      expect(md).toContain('## Timeline');
      expect(md).toContain('## Resolution');
    });

    it('should be valid markdown', async () => {
      const pm = await generator.generatePostMortem(incidentId, sampleTimeline, sampleDecisions);
      const md = generator.formatAsMarkdown(pm);
      expect(md).toContain('#');
      expect(md.length).toBeGreaterThan(100);
    });

    it('should be readable and well-structured', async () => {
      const pm = await generator.generatePostMortem(incidentId, sampleTimeline, sampleDecisions);
      const md = generator.formatAsMarkdown(pm);
      expect(md).toContain('## Summary');
      expect(md).toContain('## Duration');
      expect(md).toContain('## Lessons Learned');
      expect(md).toContain('## Preventive Measures');
    });
  });

  describe('storePostMortem', () => {
    it('should store post-mortem to file', async () => {
      const pm = await generator.generatePostMortem(incidentId, sampleTimeline, sampleDecisions);
      await generator.storePostMortem(incidentId, pm);
      const filePath = path.join(tempDir, `${incidentId}-postmortem.md`);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should persist to .squad/incidents/', async () => {
      const pm = await generator.generatePostMortem(incidentId, sampleTimeline, sampleDecisions);
      await generator.storePostMortem(incidentId, pm);
      const content = fs.readFileSync(path.join(tempDir, `${incidentId}-postmortem.md`), 'utf-8');
      expect(content).toContain('Post-Mortem');
      expect(content).toContain(incidentId);
    });
  });
});
