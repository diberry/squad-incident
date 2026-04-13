import { describe, it, expect, beforeEach } from 'vitest';
import { PRChangeGenerator } from '../src/pr-changes';
import { FileChange } from '../src/types';

describe('PR Change Generator', () => {
  let generator: PRChangeGenerator;

  beforeEach(() => {
    generator = new PRChangeGenerator();
  });

  describe('generateChanges', () => {
    it('should generate code changes from fix description', async () => {
      const changes = await generator.generateChanges('Add index to users table', {
        file: 'src/db/migrations.ts',
        language: 'typescript',
        content: 'const migrations = [];',
      });
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].path).toBe('src/db/migrations.ts');
    });

    it('should return file changes with before/after', async () => {
      const changes = await generator.generateChanges('Fix timeout', {
        file: 'src/api.ts',
        language: 'typescript',
        content: 'const timeout = 5000;',
      });
      expect(changes[0]).toHaveProperty('before');
      expect(changes[0]).toHaveProperty('after');
      expect(changes[0].before).toBe('const timeout = 5000;');
      expect(changes[0].after).toContain('Fix timeout');
      expect(changes[0].after).toContain('manual verification required');
      expect(changes[0].explanation).toContain('Template suggestion');
    });

    it('should handle multiple file changes', async () => {
      const changes = await generator.generateMultiFileChanges([
        { description: 'Fix A', context: { file: 'a.ts' } },
        { description: 'Fix B', context: { file: 'b.ts' } },
      ]);
      expect(changes.length).toBe(2);
    });
  });

  describe('addExplanatoryComments', () => {
    it('should include comments explaining change', () => {
      const changes: FileChange[] = [{
        path: 'src/fix.ts',
        language: 'typescript',
        before: 'old',
        after: 'new',
        explanation: 'original',
      }];
      const commented = generator.addExplanatoryComments(changes, 'Performance improvement');
      expect(commented[0].after).toContain('Reason: Performance improvement');
    });

    it('should preserve original code structure', () => {
      const changes: FileChange[] = [{
        path: 'src/fix.ts',
        language: 'typescript',
        before: 'const x = 1;',
        after: 'const x = 2;',
        explanation: 'update value',
      }];
      const commented = generator.addExplanatoryComments(changes, 'reason');
      expect(commented[0].after).toContain('const x = 2;');
    });
  });

  describe('generateMultiFileChanges', () => {
    it('should handle multi-file changes', async () => {
      const changes = await generator.generateMultiFileChanges([
        { description: 'Fix 1', context: { file: 'a.ts' } },
        { description: 'Fix 2', context: { file: 'b.ts' } },
        { description: 'Fix 3', context: { file: 'c.ts' } },
      ]);
      expect(changes.length).toBe(3);
    });

    it('should coordinate changes across files', async () => {
      const changes = await generator.generateMultiFileChanges([
        { description: 'shared fix', context: { file: 'a.ts', content: '' } },
        { description: 'shared fix', context: { file: 'b.ts', content: '' } },
      ]);
      expect(changes[0].explanation).toBe(changes[1].explanation);
    });
  });

  describe('validateSyntax', () => {
    it('should validate generated code syntax', () => {
      const valid: FileChange = {
        path: 'test.ts',
        language: 'typescript',
        before: '',
        after: 'const x = { a: 1, b: "hello" };',
        explanation: '',
      };
      expect(generator.validateSyntax(valid)).toBe(true);
    });

    it('should detect syntax errors', () => {
      const invalid: FileChange = {
        path: 'test.ts',
        language: 'typescript',
        before: '',
        after: 'const x = { a: 1, b: "hello }',
        explanation: '',
      };
      expect(generator.validateSyntax(invalid)).toBe(false);
    });
  });
});
