import { describe, it, expect, beforeEach } from 'vitest';
import { SummarizerAgent } from '../src/summarizer-agent';
import { Incident, IncidentSummary } from '../src/types';

describe('Summarizer Agent', () => {
  let agent: SummarizerAgent;
  let sampleIncident: Incident;

  beforeEach(() => {
    agent = new SummarizerAgent();
    sampleIncident = {
      id: 'inc-001',
      title: 'Production: Database CPU 95%',
      service: 'database',
      severity: 'critical',
      description: 'Database server CPU critical',
      createdAt: new Date(),
      issueUrl: 'https://github.com/example/repo/issues/42',
      labels: ['service:database', 'severity:critical']
    };
  });

  describe('generateSummary', () => {
    it('should generate incident summary', async () => {
      const summary = await agent.generateSummary(sampleIncident);
      expect(summary).toBeDefined();
      expect(summary.what).toContain('Database');
      expect(summary.severity).toBe('critical');
      expect(summary.likely_cause).toBeTruthy();
      expect(summary.affected_services).toContain('database');
    });

    it('should cite code locations in summary', async () => {
      const incidentWithFile: Incident = {
        ...sampleIncident,
        description: 'Error in src/api/handler.ts causing CPU spike',
      };
      const summary = await agent.generateSummary(incidentWithFile);
      expect(summary.code_references.length).toBeGreaterThanOrEqual(1);
      expect(summary.code_references[0].file).toBe('src/api/handler.ts');
    });

    it('should include affected services', async () => {
      const summary = await agent.generateSummary(sampleIncident);
      expect(summary.affected_services).toBeInstanceOf(Array);
      expect(summary.affected_services.length).toBeGreaterThan(0);
      expect(summary.affected_services).toContain('database');
    });
  });

  describe('detectSeverity', () => {
    it('should detect severity from incident metadata', () => {
      expect(agent.detectSeverity(sampleIncident)).toBe('critical');
    });

    it('should default to medium for unknown severity', () => {
      const unknownIncident: Incident = {
        ...sampleIncident,
        severity: 'medium',
        labels: [],
        title: 'Some generic issue',
      };
      expect(agent.detectSeverity(unknownIncident)).toBe('medium');
    });
  });
});
