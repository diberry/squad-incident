import { describe, it, expect, beforeEach } from 'vitest';
import { parseIncidentFromIssue, extractServiceName } from '../src/incident-intake';
import { Incident } from '../src/types';

describe('Incident Intake', () => {
  describe('parseIncidentFromIssue', () => {
    it('should parse incident from GitHub issue', async () => {
      const issue = {
        id: 42,
        title: 'Production: Database CPU 95%',
        body: 'Database server CPU utilization spiked to 95%',
        labels: [{ name: 'service:database' }, { name: 'severity:critical' }],
        created_at: '2024-04-12T10:30:00Z',
        html_url: 'https://github.com/example/repo/issues/42',
      };

      const incident = await parseIncidentFromIssue(issue);

      expect(incident.id).toBe('42');
      expect(incident.title).toBe('Production: Database CPU 95%');
      expect(incident.service).toBe('database');
      expect(incident.severity).toBe('critical');
      expect(incident.description).toContain('CPU utilization');
      expect(incident.issueUrl).toBe('https://github.com/example/repo/issues/42');
      expect(incident.labels).toContain('service:database');
    });

    it('should extract service name from incident title or labels', async () => {
      const issue = {
        id: 43,
        title: 'Production: API latency spike',
        body: 'API response times elevated',
        labels: ['service:api', 'severity:high'],
        html_url: 'https://github.com/example/repo/issues/43',
      };

      const incident = await parseIncidentFromIssue(issue);
      expect(incident.service).toBe('api');
    });

    it('should handle malformed incidents gracefully', async () => {
      const issue = {
        id: 44,
        title: 'Something is broken',
        body: 'No details',
        labels: [],
      };

      const incident = await parseIncidentFromIssue(issue);
      expect(incident.service).toBe('unknown');
      expect(incident.severity).toBe('medium');
      expect(incident.title).toBe('Something is broken');
    });
  });

  describe('extractServiceName', () => {
    it('should identify service from labels', () => {
      const incident: Incident = {
        id: 'inc-001',
        title: 'Alert',
        service: 'api',
        severity: 'high',
        description: '',
        createdAt: new Date(),
        issueUrl: '',
        labels: ['service:api', 'severity:high'],
      };

      expect(extractServiceName(incident)).toBe('api');
    });

    it('should return unknown for missing service', () => {
      const incident: Incident = {
        id: 'inc-002',
        title: 'Generic issue',
        service: 'unknown',
        severity: 'medium',
        description: '',
        createdAt: new Date(),
        issueUrl: '',
        labels: [],
      };

      expect(extractServiceName(incident)).toBe('unknown');
    });
  });
});
