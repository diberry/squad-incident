import { Incident, IncidentSummary, CodeReference } from './types';

/**
 * Summarizer agent that generates incident summaries
 */
export class SummarizerAgent {
  /**
   * Generate incident summary
   */
  async generateSummary(incident: Incident, codeRefs?: CodeReference[]): Promise<IncidentSummary> {
    const severity = this.detectSeverity(incident);
    const fileRefs = this.extractCodeReferences(incident.description);
    const allRefs = [...fileRefs, ...(codeRefs ?? [])];

    return {
      what: `${incident.title}: ${incident.description}`,
      where: allRefs.length > 0 ? allRefs.map(r => r.file) : [incident.service],
      severity,
      likely_cause: this.inferLikelyCause(incident),
      affected_services: [incident.service],
      code_references: allRefs,
    };
  }

  /**
   * Detect severity from incident metadata
   */
  detectSeverity(incident: Incident): string {
    // Check labels first
    for (const label of incident.labels) {
      const match = label.match(/^severity:(.+)$/i);
      if (match) return match[1].trim().toLowerCase();
    }

    // Check severity field
    if (incident.severity) return incident.severity;

    // Check title for keywords
    const lower = incident.title.toLowerCase();
    if (lower.includes('critical') || lower.includes('p0')) return 'critical';
    if (lower.includes('high') || lower.includes('p1')) return 'high';
    if (lower.includes('low')) return 'low';

    return 'medium';
  }

  private extractCodeReferences(text: string): CodeReference[] {
    const refs: CodeReference[] = [];
    // Match file patterns like src/api/handler.ts or handler.ts:42
    const filePattern = /(?:^|\s)([\w/.-]+\.\w{1,4})(?::(\d+)(?:-(\d+))?)?/g;
    let match;
    while ((match = filePattern.exec(text)) !== null) {
      const ext = match[1].split('.').pop() ?? '';
      if (['ts', 'js', 'py', 'go', 'rs', 'java', 'rb', 'tsx', 'jsx'].includes(ext)) {
        refs.push({
          file: match[1],
          startLine: match[2] ? parseInt(match[2]) : undefined,
          endLine: match[3] ? parseInt(match[3]) : undefined,
          language: ext === 'ts' || ext === 'tsx' ? 'typescript' : ext,
        });
      }
    }
    return refs;
  }

  private inferLikelyCause(incident: Incident): string {
    const desc = `${incident.title} ${incident.description}`.toLowerCase();
    if (desc.includes('cpu')) return 'Resource exhaustion — high CPU utilization';
    if (desc.includes('memory') || desc.includes('oom')) return 'Memory pressure or leak';
    if (desc.includes('timeout')) return 'Request timeout — possible downstream dependency failure';
    if (desc.includes('connection')) return 'Connection pool exhaustion or network issue';
    if (desc.includes('disk')) return 'Disk I/O saturation';
    return 'Unknown — requires further investigation';
  }
}
