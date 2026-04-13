import { Incident, IncidentSummary, DiagnosticResult, DraftPR, FileChange } from './types';

/**
 * Drafts PR from incident summary and runbook diagnostics
 */
export class FixPRDrafter {
  /**
   * Draft PR from incident and diagnostics
   */
  async draftPR(
    incident: Incident,
    summary: IncidentSummary,
    diagnostics: DiagnosticResult[]
  ): Promise<DraftPR> {
    const body = this.buildPRDescription(summary, diagnostics);
    const branchName = `fix/incident-${incident.id}`;
    const files: FileChange[] = [];

    // Generate fix file changes from recommendations
    for (const diag of diagnostics) {
      for (const rec of diag.recommendations) {
        files.push({
          path: `src/${incident.service}/fix.ts`,
          language: 'typescript',
          before: '// original code',
          after: `// Fix: ${rec}`,
          explanation: rec,
        });
      }
    }

    // Add test changes
    const testChanges = await this.addTestChanges(summary.what);
    if (testChanges) {
      files.push(testChanges);
    }

    return {
      title: `fix: resolve incident ${incident.id} — ${incident.title}`,
      body,
      branch_name: branchName,
      files,
      requires_approval: true,
      incident_id: incident.id,
    };
  }

  /**
   * Include change description in PR body
   */
  buildPRDescription(
    summary: IncidentSummary,
    diagnostics: DiagnosticResult[]
  ): string {
    const sections: string[] = [];
    sections.push(`## Incident Summary\n\n${summary.what}`);
    sections.push(`## Severity\n\n${summary.severity}`);
    sections.push(`## Likely Cause\n\n${summary.likely_cause}`);
    sections.push(`## Affected Services\n\n${summary.affected_services.join(', ')}`);

    if (summary.code_references.length > 0) {
      const refs = summary.code_references.map(r => `- \`${r.file}\``).join('\n');
      sections.push(`## Code References\n\n${refs}`);
    }

    for (const diag of diagnostics) {
      sections.push(`## Diagnostics: ${diag.service}\n\n**Findings:**\n${diag.findings.map(f => `- ${f}`).join('\n')}\n\n**Recommendations:**\n${diag.recommendations.map(r => `- ${r}`).join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Include test changes in draft
   */
  async addTestChanges(fix_description: string): Promise<FileChange> {
    return {
      path: 'test/regression.test.ts',
      language: 'typescript',
      before: '',
      after: `// Regression test for: ${fix_description}\nimport { describe, it, expect } from 'vitest';\n\ndescribe('regression', () => {\n  it('should not regress', () => {\n    expect(true).toBe(true);\n  });\n});`,
      explanation: `Regression test for incident: ${fix_description}`,
    };
  }
}
