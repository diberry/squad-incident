import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiagnosticRouter } from '../src/diagnostic-router';
import { RunbookRegistry } from '../src/runbook-registry';
import { Incident, DiagnosticResult } from '../src/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Diagnostic Router', () => {
  let router: DiagnosticRouter;
  let registry: RunbookRegistry;
  let sampleIncident: Incident;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(process.cwd(), '.test-diag-runbooks');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'database-runbook.md'), `# Database\n## Diagnostics\n- Check CPU\n- Check queries\n## Resolution\n1. Optimize queries`);
    fs.writeFileSync(path.join(tempDir, 'api-runbook.md'), `# API\n## Diagnostics\n- Check latency\n## Resolution\n1. Scale up`);

    registry = new RunbookRegistry();
    await registry.loadRunbooks(tempDir);
    router = new DiagnosticRouter(registry);

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
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('routeToDiagnostics', () => {
    it('should route incident to correct diagnostic skill', async () => {
      const results = await router.routeToDiagnostics(sampleIncident);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].service).toBe('database');
    });

    it('should return diagnostic results', async () => {
      const results = await router.routeToDiagnostics(sampleIncident);
      expect(results[0]).toHaveProperty('findings');
      expect(results[0]).toHaveProperty('recommendations');
      expect(results[0].status).toBe('success');
    });
  });

  describe('routeMultiService', () => {
    it('should handle multi-service incidents', async () => {
      const results = await router.routeMultiService(['database', 'api']);
      expect(results.size).toBe(2);
      expect(results.has('database')).toBe(true);
      expect(results.has('api')).toBe(true);
    });

    it('should spawn parallel diagnostic agents', async () => {
      const results = await router.routeMultiService(['database', 'api']);
      expect(results.get('database')!.service).toBe('database');
      expect(results.get('api')!.service).toBe('api');
    });
  });

  describe('aggregateResults', () => {
    it('should aggregate diagnostic results', () => {
      const results: DiagnosticResult[] = [
        { service: 'database', status: 'success', findings: ['high CPU'], recommendations: ['optimize'] },
        { service: 'api', status: 'partial', findings: ['slow response'], recommendations: ['scale'] },
      ];
      const aggregated = router.aggregateResults(results);
      expect(aggregated.service).toContain('database');
      expect(aggregated.service).toContain('api');
      expect(aggregated.status).toBe('partial');
    });

    it('should merge findings and recommendations', () => {
      const results: DiagnosticResult[] = [
        { service: 'a', status: 'success', findings: ['f1'], recommendations: ['r1'] },
        { service: 'b', status: 'success', findings: ['f2'], recommendations: ['r2'] },
      ];
      const aggregated = router.aggregateResults(results);
      expect(aggregated.findings).toContain('f1');
      expect(aggregated.findings).toContain('f2');
      expect(aggregated.recommendations).toContain('r1');
      expect(aggregated.recommendations).toContain('r2');
    });
  });
});
