import { Incident, IncidentSummary, DiagnosticResult, DraftPR, FileChange } from './types';

/**
 * Drafts a triage report structured as a PR template from incident diagnostics.
 *
 * This does NOT generate real code diffs or compilable fixes. It produces
 * template-based suggestions that describe what a human engineer should
 * investigate and change. All output requires manual verification.
 */
export class FixPRDrafter {
  /**
   * Build a triage report structured as a draft PR.
   * Suggestions are template-based — not real code diffs.
   */
  async draftPR(
    incident: Incident,
    summary: IncidentSummary,
    diagnostics: DiagnosticResult[]
  ): Promise<DraftPR> {
    const body = this.buildPRDescription(summary, diagnostics);
    const branchName = `fix/incident-${incident.id}`;
    const files: FileChange[] = [];

    // Generate template-based suggestions from recommendations
    for (const diag of diagnostics) {
      for (const rec of diag.recommendations) {
        files.push({
          path: `src/${incident.service}/fix.ts`,
          language: 'typescript',
          before: '// original code',
          after: `// Suggested fix (manual verification required): ${rec}`,
          explanation: `[Template suggestion] ${rec} — requires human review`,
        });
      }
    }

    // Add a note about manual verification instead of a fake test
    const verificationNote = this.addVerificationNote(summary.what);
    files.push(verificationNote);

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

    sections.push(`## ⚠️ Manual Verification Required\n\nAll suggested changes are template-based and require human review before implementation.`);

    return sections.join('\n\n');
  }

  /**
   * Return a verification note instead of a fake test.
   * Replaces the previous addTestChanges which generated expect(true).toBe(true).
   */
  addVerificationNote(fix_description: string): FileChange {
    return {
      path: 'test/verification-checklist.md',
      language: 'markdown',
      before: '',
      after: `# Manual Verification Checklist\n\n- [ ] Review suggested changes for: ${fix_description}\n- [ ] Write targeted regression tests for the actual fix\n- [ ] Verify fix resolves the incident in a staging environment\n- [ ] Get peer review before merging`,
      explanation: `Manual verification required — suggested changes need human review`,
    };
  }
}
