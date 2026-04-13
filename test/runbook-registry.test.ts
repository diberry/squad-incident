import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RunbookRegistry } from '../src/runbook-registry';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

describe('Runbook Registry', () => {
  let registry: RunbookRegistry;
  let tempDir: string;

  beforeEach(() => {
    registry = new RunbookRegistry();
    // Use project-relative test temp dir
    tempDir = path.join(process.cwd(), '.test-runbooks');
    fs.mkdirSync(tempDir, { recursive: true });

    // Create sample runbooks
    fs.writeFileSync(path.join(tempDir, 'database-runbook.md'), `# Database Runbook
## Diagnostics
- Check CPU usage
- Check slow query log
## Resolution
1. Optimize slow queries
2. Add indexes
`);
    fs.writeFileSync(path.join(tempDir, 'api-runbook.md'), `# API Runbook
## Diagnostics
- Check latency metrics
- Check error rates
## Resolution
1. Scale up instances
2. Fix error handling
`);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('loadRunbooks', () => {
    it('should load runbooks as skills', async () => {
      const runbooks = await registry.loadRunbooks(tempDir);
      expect(runbooks.size).toBe(2);
      expect(runbooks.has('database')).toBe(true);
      expect(runbooks.has('api')).toBe(true);
    });

    it('should parse runbook metadata', async () => {
      await registry.loadRunbooks(tempDir);
      const all = registry.getAllRunbooks();
      const db = all.get('database');
      expect(db).toBeDefined();
      expect(db!.diagnosticSteps.length).toBeGreaterThan(0);
      expect(db!.resolutionSteps.length).toBeGreaterThan(0);
    });
  });

  describe('listByService', () => {
    it('should list available runbooks by service', async () => {
      await registry.loadRunbooks(tempDir);
      const dbRunbooks = registry.listByService('database');
      expect(dbRunbooks.length).toBe(1);
      expect(dbRunbooks[0].service).toBe('database');
    });

    it('should return empty array for unknown service', () => {
      expect(registry.listByService('nonexistent')).toEqual([]);
    });
  });

  describe('executeDiagnostics', () => {
    it('should execute diagnostic steps from runbook', async () => {
      await registry.loadRunbooks(tempDir);
      const result = await registry.executeDiagnostics('database');
      expect(result.stepsExecuted.length).toBeGreaterThan(0);
      expect(result.service).toBe('database');
    });

    it('should return structured diagnostic result', async () => {
      await registry.loadRunbooks(tempDir);
      const result = await registry.executeDiagnostics('database');
      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('runbook');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('recommendations');
    });
  });

  describe('getAllRunbooks', () => {
    it('should return all registered runbooks', async () => {
      await registry.loadRunbooks(tempDir);
      const all = registry.getAllRunbooks();
      expect(all.size).toBe(2);
    });
  });
});
