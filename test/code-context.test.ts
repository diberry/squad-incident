import { describe, it, expect, beforeEach } from 'vitest';
import { CodeContextFetcher } from '../src/code-context';

describe('Code Context Fetcher', () => {
  let fetcher: CodeContextFetcher;

  beforeEach(() => {
    fetcher = new CodeContextFetcher();
  });

  describe('fetchRelevantCode', () => {
    it('should fetch relevant code files', async () => {
      const results = await fetcher.fetchRelevantCode('api', 'Error in handler.ts');
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].file).toContain('handler.ts');
      expect(results[0].language).toBe('typescript');
    });

    it('should handle error messages referencing files', async () => {
      const results = await fetcher.fetchRelevantCode('db', 'crash in src/db/query.ts:42');
      expect(results.some(r => r.file === 'src/db/query.ts')).toBe(true);
    });

    it('should respect repo structure', async () => {
      const adapter = {
        async fetchFileContent(_repo: string, _path: string) {
          return 'const x = 1;';
        },
      };
      const fetcherWithAdapter = new CodeContextFetcher(adapter);
      const results = await fetcherWithAdapter.fetchRelevantCode('api', 'Error in handler.ts', 'example/repo');
      expect(results[0].content).toBe('const x = 1;');
    });
  });

  describe('caching', () => {
    it('should cache fetched files', async () => {
      await fetcher.fetchRelevantCode('api', 'Error in handler.ts');
      const cached = fetcher.getCachedFile('handler.ts');
      expect(cached).toBeDefined();
      expect(cached!.file).toBe('handler.ts');
    });

    it('should retrieve from cache on repeated requests', () => {
      // Manually insert into cache by fetching
      fetcher.fetchRelevantCode('api', 'Error in handler.ts');
      const first = fetcher.getCachedFile('handler.ts');
      const second = fetcher.getCachedFile('handler.ts');
      expect(first).toEqual(second);
    });

    it('should clear cache', async () => {
      await fetcher.fetchRelevantCode('api', 'Error in handler.ts');
      expect(fetcher.getCachedFile('handler.ts')).toBeDefined();
      fetcher.clearCache();
      expect(fetcher.getCachedFile('handler.ts')).toBeUndefined();
    });
  });

  describe('getCachedFile', () => {
    it('should return undefined for uncached file', () => {
      expect(fetcher.getCachedFile('nonexistent.ts')).toBeUndefined();
    });
  });
});
