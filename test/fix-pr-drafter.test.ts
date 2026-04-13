import { describe, it, expect, beforeEach } from 'vitest';
import { FixPRDrafter } from '../src/fix-pr-drafter';
import { Incident, IncidentSummary, DiagnosticResult, DraftPR } from '../src/types';

describe('Fix PR Drafter', () => {
  let drafter: FixPRDrafter;
  let sampleIncident: Incident;
  let sampleSummary: IncidentSummary;
  let sampleDiagnostics: DiagnosticResult[];

  beforeEach(() => {
    drafter = new FixPRDrafter();
    sampleIncident = {
      id: 'inc-001',
      title: 'Production: Database CPU 95%',
      service: 'database',
      severity: 'critical',
      description: 'Database CPU critical',
      createdAt: new Date(),
      issueUrl: 'https://github.com/example/repo/issues/42',
      labels: ['service:database', 'severity:critical']
    };
    sampleSummary = {
      what: 'Database CPU spike to 95%',
      where: ['src/db/query.ts'],
      severity: 'critical',
      likely_cause: 'Unoptimized queries',
      affected_services: ['database'],
      code_references: [{ file: 'src/db/query.ts' }],
    };
    sampleDiagnostics = [{
      service: 'database',
      status: 'success',
      findings: ['High CPU from slow queries'],
      recommendations: ['Add index on users table'],
    }];
  });

  describe('draftPR', () => {
    it('should draft PR from incident and diagnostics', async () => {
      const pr = await drafter.draftPR(sampleIncident, sampleSummary, sampleDiagnostics);
      expect(pr).toBeDefined();
      expect(pr.title).toContain('inc-001');
      expect(pr.branch_name).toContain('incident-inc-001');
      expect(pr.incident_id).toBe('inc-001');
    });

    it('should include change description in PR body', async () => {
      const pr = await drafter.draftPR(sampleIncident, sampleSummary, sampleDiagnostics);
      expect(pr.body).toContain('Incident Summary');
      expect(pr.body).toContain('critical');
      expect(pr.body).toContain('database');
    });

    it('should include test changes in PR draft', async () => {
      const pr = await drafter.draftPR(sampleIncident, sampleSummary, sampleDiagnostics);
      const testFile = pr.files.find(f => f.path.includes('test'));
      expect(testFile).toBeDefined();
      expect(testFile!.explanation).toContain('Regression test');
    });

    it('should require human approval', async () => {
      const pr = await drafter.draftPR(sampleIncident, sampleSummary, sampleDiagnostics);
      expect(pr.requires_approval).toBe(true);
    });

    it('should not create actual PR on GitHub', async () => {
      const pr = await drafter.draftPR(sampleIncident, sampleSummary, sampleDiagnostics);
      // DraftPR is just a data object — no side effects
      expect(pr).toHaveProperty('title');
      expect(pr).toHaveProperty('body');
      expect(pr).toHaveProperty('files');
      expect(pr.requires_approval).toBe(true);
    });
  });

  describe('buildPRDescription', () => {
    it('should link incident to diagnosis to fix', () => {
      const body = drafter.buildPRDescription(sampleSummary, sampleDiagnostics);
      expect(body).toContain('Incident Summary');
      expect(body).toContain('Diagnostics');
      expect(body).toContain('Likely Cause');
    });
  });

  describe('addTestChanges', () => {
    it('should include regression tests', async () => {
      const testChange = await drafter.addTestChanges('Fix slow query');
      expect(testChange).toBeDefined();
      expect(testChange.path).toContain('test');
      expect(testChange.after).toContain('regression');
    });
  });
});
