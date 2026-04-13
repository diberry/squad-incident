import { CodeReference } from './types';

export interface CodeFile {
  file: string;
  language: string;
  content: string;
  startLine?: number;
  endLine?: number;
}

export interface PlatformAdapter {
  fetchFileContent(repo: string, path: string): Promise<string>;
}

/**
 * Fetches relevant code context for incidents
 */
export class CodeContextFetcher {
  private cache: Map<string, CodeFile> = new Map();
  private platformAdapter?: PlatformAdapter;

  constructor(adapter?: PlatformAdapter) {
    this.platformAdapter = adapter;
  }

  /**
   * Fetch relevant code files
   */
  async fetchRelevantCode(
    service: string,
    errorMessage: string,
    repo?: string
  ): Promise<CodeFile[]> {
    const filePaths = this.extractFilePaths(errorMessage);
    const results: CodeFile[] = [];

    for (const filePath of filePaths) {
      const cached = this.getCachedFile(filePath);
      if (cached) {
        results.push(cached);
        continue;
      }

      const ext = filePath.split('.').pop() ?? '';
      const language = this.detectLanguage(ext);

      let content = '';
      if (this.platformAdapter && repo) {
        try {
          content = await this.platformAdapter.fetchFileContent(repo, filePath);
        } catch {
          content = `// Could not fetch ${filePath}`;
        }
      } else {
        content = `// File reference: ${filePath}`;
      }

      const codeFile: CodeFile = { file: filePath, language, content };
      this.cache.set(filePath, codeFile);
      results.push(codeFile);
    }

    // If no specific files found, return a service-level placeholder
    if (results.length === 0) {
      const placeholder: CodeFile = {
        file: `src/${service}/index.ts`,
        language: 'typescript',
        content: `// Service: ${service}`,
      };
      results.push(placeholder);
    }

    return results;
  }

  /**
   * Get cached file if available
   */
  getCachedFile(path: string): CodeFile | undefined {
    return this.cache.get(path);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  private extractFilePaths(text: string): string[] {
    const paths: string[] = [];
    const pattern = /([\w/.-]+\.\w{1,4})/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ext = match[1].split('.').pop() ?? '';
      if (['ts', 'js', 'py', 'go', 'rs', 'java', 'rb', 'tsx', 'jsx', 'sql'].includes(ext)) {
        if (!paths.includes(match[1])) paths.push(match[1]);
      }
    }
    return paths;
  }

  private detectLanguage(ext: string): string {
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', go: 'go', rs: 'rust', java: 'java', rb: 'ruby', sql: 'sql',
    };
    return langMap[ext] ?? ext;
  }
}
