import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IncidentResponseOrchestrator } from '../src/orchestrator';
import { Incident, IncidentCoordinatorState } from '../src/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Incident Response Orchestrator', () => {
  let orchestrator: IncidentResponseOrchestrator;
  let sampleIncident: Incident;
  const checkpointDir = path.join(process.cwd(), '.test-checkpoints');

  beforeEach(() => {
    orchestrator = new IncidentResponseOrchestrator(checkpointDir);
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

  afterEach(() => {
    fs.rmSync(checkpointDir, { recursive: true, force: true });
  });

  describe('runWorkflow', () => {
    it('should run complete incident response workflow', async () => {
      const state = await orchestrator.runWorkflow(sampleIncident);
      expect(state).toBeDefined();
      expect(state.incident.id).toBe('inc-001');
    });

    it('should generate summary and draft PR', async () => {
      const state = await orchestrator.runWorkflow(sampleIncident);
      expect(state.summary).toBeDefined();
      expect(state.summary!.what).toBeTruthy();
      expect(state.draft_pr).toBeDefined();
      expect(state.draft_pr!.title).toContain('inc-001');
    });

    it('should record timeline and decisions', async () => {
      const state = await orchestrator.runWorkflow(sampleIncident);
      expect(state.timeline.length).toBeGreaterThan(0);
      expect(state.decisions.length).toBeGreaterThan(0);
    });

    it('should complete successfully', async () => {
      const state = await orchestrator.runWorkflow(sampleIncident);
      expect(['completed', 'awaiting_approval']).toContain(state.status);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const state = await orchestrator.runWorkflow(sampleIncident);
      // Should not throw even if diagnostics have no runbooks loaded
      expect(state).toBeDefined();
    });

    it('should log errors to state', async () => {
      const state: IncidentCoordinatorState = {
        incident: sampleIncident,
        diagnostics: new Map(),
        timeline: [],
        decisions: [],
        status: 'investigating',
      };
      await orchestrator.handleError(new Error('test error'), state);
      expect(state.timeline.some(e => e.action === 'error_occurred')).toBe(true);
    });

    it('should continue with available data', async () => {
      const state = await orchestrator.runWorkflow(sampleIncident);
      // Even without loaded runbooks, should still produce a summary and draft
      expect(state.summary).toBeDefined();
    });
  });

  describe('checkpoint support', () => {
    it('should support workflow checkpoints', async () => {
      const state = await orchestrator.runWorkflow(sampleIncident);
      const filePath = path.join(checkpointDir, `${sampleIncident.id}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should resume from checkpoint', async () => {
      await orchestrator.runWorkflow(sampleIncident);
      const restored = await orchestrator.resumeFromCheckpoint(sampleIncident.id);
      expect(restored.incident.id).toBe('inc-001');
      expect(restored.incident.createdAt).toBeInstanceOf(Date);
    });

    it('should preserve state across resume', async () => {
      const original = await orchestrator.runWorkflow(sampleIncident);
      const restored = await orchestrator.resumeFromCheckpoint(sampleIncident.id);
      expect(restored.status).toBe(original.status);
      expect(restored.summary?.what).toBe(original.summary?.what);
    });
  });
});
