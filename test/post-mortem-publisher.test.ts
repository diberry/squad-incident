import { describe, it, expect, beforeEach } from 'vitest';
import { PostMortemPublisher } from '../src/post-mortem-publisher';
import { PostMortem, TimelineEntry } from '../src/types';

describe('Post-Mortem Publisher', () => {
  let publisher: PostMortemPublisher;
  let samplePostMortem: PostMortem;
  const incidentId = 'inc-001';

  beforeEach(() => {
    publisher = new PostMortemPublisher();
    samplePostMortem = {
      incident_id: incidentId,
      incident_summary: {
        what: 'Database CPU spike',
        where: ['src/db'],
        severity: 'critical',
        likely_cause: 'Unoptimized queries',
        affected_services: ['database'],
        code_references: [],
      },
      timeline: [
        { timestamp: new Date('2024-04-12T10:00:00Z'), action: 'incident_created', details: {} },
        { timestamp: new Date('2024-04-12T10:45:00Z'), action: 'resolved', details: {} },
      ],
      decisions: [
        { id: 'dec-1', timestamp: new Date(), decision_type: 'approved_fix', context: {}, made_by: 'alice' },
      ],
      resolution: 'Applied index optimization',
      duration_minutes: 45,
      lessons_learned: ['Improve monitoring'],
      preventive_measures: ['Add alerting thresholds'],
    };
  });

  describe('publishToGitHub', () => {
    it('should publish post-mortem to GitHub', async () => {
      let posted = false;
      const adapter = {
        async postIssueComment(_url: string, _body: string) { posted = true; },
      };
      const pub = new PostMortemPublisher(adapter);
      await pub.publishToGitHub(incidentId, samplePostMortem, 'https://github.com/example/repo/issues/42');
      expect(posted).toBe(true);
    });

    it('should post comment on original incident issue', async () => {
      let capturedBody = '';
      const adapter = {
        async postIssueComment(_url: string, body: string) { capturedBody = body; },
      };
      const pub = new PostMortemPublisher(adapter);
      await pub.publishToGitHub(incidentId, samplePostMortem, 'https://github.com/example/repo/issues/42');
      expect(capturedBody).toContain('Post-Mortem');
      expect(capturedBody).toContain(incidentId);
    });
  });

  describe('publishToSlack', () => {
    it('should support optional Slack posting', async () => {
      const result = await publisher.publishToSlack(samplePostMortem, 'https://hooks.slack.com/test');
      expect(result.ok).toBe(true);
    });

    it('should use webhook URL from environment', async () => {
      const result = await publisher.publishToSlack(samplePostMortem, '');
      expect(result.ok).toBe(false);
    });

    it('should format for Slack channels', async () => {
      const result = await publisher.publishToSlack(samplePostMortem, 'https://hooks.slack.com/test');
      expect(result.channel).toBe('incidents');
    });
  });

  describe('formatForPublishing', () => {
    it('should format for readability and archival', () => {
      const formatted = publisher.formatForPublishing(samplePostMortem);
      expect(formatted.github).toBeTruthy();
      expect(formatted.slack).toBeTruthy();
    });

    it('should return both GitHub and Slack formats', () => {
      const formatted = publisher.formatForPublishing(samplePostMortem);
      expect(formatted.github).toContain('Post-Mortem');
      expect(formatted.slack).toContain('Post-Mortem');
      expect(formatted.github).toContain('##');  // Markdown headers
      expect(formatted.slack).toContain('*');     // Slack bold
    });
  });

  describe('extractLessonsLearned', () => {
    it('should include lessons learned section', () => {
      const timeline: TimelineEntry[] = [
        { timestamp: new Date(), action: 'incident_created', details: {} },
        { timestamp: new Date(), action: 'resolved', details: {} },
      ];
      const lessons = publisher.extractLessonsLearned(timeline);
      expect(lessons.length).toBeGreaterThan(0);
    });

    it('should suggest preventive measures', () => {
      const timeline: TimelineEntry[] = [
        { timestamp: new Date(), action: 'escalated_to_oncall', details: {} },
        { timestamp: new Date(), action: 'step1', details: {} },
        { timestamp: new Date(), action: 'step2', details: {} },
        { timestamp: new Date(), action: 'step3', details: {} },
        { timestamp: new Date(), action: 'step4', details: {} },
        { timestamp: new Date(), action: 'step5', details: {} },
        { timestamp: new Date(), action: 'resolved', details: {} },
      ];
      const lessons = publisher.extractLessonsLearned(timeline);
      expect(lessons.some(l => l.includes('escalat'))).toBe(true);
      expect(lessons.some(l => l.includes('automat'))).toBe(true);
    });
  });
});
