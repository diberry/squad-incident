import { FileChange } from './types';

/**
 * Generates code changes for PR from fix descriptions
 */
export class PRChangeGenerator {
  /**
   * Generate code changes from fix description
   */
  async generateChanges(fix_description: string, code_context: any): Promise<FileChange[]> {
    const filePath = code_context?.file ?? 'src/fix.ts';
    const language = code_context?.language ?? 'typescript';
    const before = code_context?.content ?? '';

    return [{
      path: filePath,
      language,
      before,
      after: `${before}\n// Fix: ${fix_description}`,
      explanation: fix_description,
    }];
  }

  /**
   * Include comments explaining changes
   */
  addExplanatoryComments(changes: FileChange[], reasoning: string): FileChange[] {
    return changes.map(change => ({
      ...change,
      after: `// Reason: ${reasoning}\n${change.after}`,
      explanation: `${change.explanation} — ${reasoning}`,
    }));
  }

  /**
   * Handle multi-file changes
   */
  async generateMultiFileChanges(fixes: any[]): Promise<FileChange[]> {
    const allChanges: FileChange[] = [];
    for (const fix of fixes) {
      const changes = await this.generateChanges(
        fix.description ?? fix,
        fix.context ?? {}
      );
      allChanges.push(...changes);
    }
    return allChanges;
  }

  /**
   * Validate generated code syntax
   */
  validateSyntax(change: FileChange): boolean {
    const code = change.after;
    // Basic validation: check for unmatched braces, parens, brackets
    const opens = (code.match(/[{(\[]/g) ?? []).length;
    const closes = (code.match(/[})\]]/g) ?? []).length;
    if (opens !== closes) return false;

    // Check for unterminated strings
    const singleQuotes = (code.match(/'/g) ?? []).length;
    const doubleQuotes = (code.match(/"/g) ?? []).length;
    const backticks = (code.match(/`/g) ?? []).length;
    if (singleQuotes % 2 !== 0) return false;
    if (doubleQuotes % 2 !== 0) return false;
    if (backticks % 2 !== 0) return false;

    return true;
  }
}
