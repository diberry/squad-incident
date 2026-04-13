import { FileChange } from './types';

/**
 * Generates template-based change suggestions from diagnostic recommendations.
 *
 * These are NOT real code diffs — they are structured suggestions that describe
 * what a human engineer should change, based on runbook diagnostics. The "after"
 * field contains a comment-based description, not compilable replacement code.
 *
 * Manual verification required — all suggestions need human review before action.
 */
export class PRChangeGenerator {
  /**
   * Generate a template-based change suggestion from a fix description.
   * Returns a structured suggestion, not a real code diff.
   */
  async generateChanges(fix_description: string, code_context: any): Promise<FileChange[]> {
    const filePath = code_context?.file ?? 'src/fix.ts';
    const language = code_context?.language ?? 'typescript';
    const before = code_context?.content ?? '';

    return [{
      path: filePath,
      language,
      before,
      after: `${before}\n// Suggested fix (manual verification required): ${fix_description}`,
      explanation: `[Template suggestion] ${fix_description} — requires human review`,
    }];
  }

  /**
   * Annotate suggestions with reasoning context.
   */
  addExplanatoryComments(changes: FileChange[], reasoning: string): FileChange[] {
    return changes.map(change => ({
      ...change,
      after: `// Reason: ${reasoning}\n${change.after}`,
      explanation: `${change.explanation} — ${reasoning}`,
    }));
  }

  /**
   * Generate template suggestions for multiple files.
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
   * Basic bracket/quote balance check on suggestion text.
   */
  validateSyntax(change: FileChange): boolean {
    const code = change.after;
    const opens = (code.match(/[{(\[]/g) ?? []).length;
    const closes = (code.match(/[})\]]/g) ?? []).length;
    if (opens !== closes) return false;

    const singleQuotes = (code.match(/'/g) ?? []).length;
    const doubleQuotes = (code.match(/"/g) ?? []).length;
    const backticks = (code.match(/`/g) ?? []).length;
    if (singleQuotes % 2 !== 0) return false;
    if (doubleQuotes % 2 !== 0) return false;
    if (backticks % 2 !== 0) return false;

    return true;
  }
}
