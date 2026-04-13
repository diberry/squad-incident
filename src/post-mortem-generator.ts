import * as fs from 'node:fs';
import * as path from 'node:path';
import { PostMortem, TimelineEntry, Decision, IncidentSummary } from './types';

/**
 * Generates post-mortem from incident timeline and decisions
 */
export class PostMortemGenerator {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? '.squad/incidents';
  }

  /**
   * Generate post-mortem from timeline and decisions
   */
  async generatePostMortem(
    incident_id: string,
    timeline: TimelineEntry[],
    decisions: Decision[]
  ): Promise<PostMortem> {
    const duration = this.calculateDuration(timeline);
    const resolution = this.extractResolution(timeline, decisions);
    const lessons = this.generateLessonsLearned(timeline, decisions);
    const preventive = this.generatePreventiveMeasures(timeline, decisions);

    const summary: IncidentSummary = {
      what: timeline[0]?.details?.description as string ?? `Incident ${incident_id}`,
      where: [],
      severity: timeline[0]?.details?.severity as string ?? 'unknown',
      likely_cause: 'See timeline for details',
      affected_services: [],
      code_references: [],
    };

    return {
      incident_id,
      incident_summary: summary,
      timeline,
      decisions,
      resolution,
      duration_minutes: duration,
      lessons_learned: lessons,
      preventive_measures: preventive,
    };
  }

  /**
   * Calculate incident duration in minutes
   */
  calculateDuration(timeline: TimelineEntry[]): number {
    if (timeline.length === 0) return 0;
    if (timeline.length === 1) return 0;

    const first = timeline[0].timestamp;
    const last = timeline[timeline.length - 1].timestamp;
    return Math.round((last.getTime() - first.getTime()) / 60000);
  }

  /**
   * Format post-mortem as markdown
   */
  formatAsMarkdown(postmortem: PostMortem): string {
    const lines: string[] = [];
    lines.push(`# Post-Mortem: ${postmortem.incident_id}`);
    lines.push('');
    lines.push(`## Summary`);
    lines.push('');
    lines.push(postmortem.incident_summary.what);
    lines.push('');
    lines.push(`## Duration`);
    lines.push('');
    lines.push(`${postmortem.duration_minutes} minutes`);
    lines.push('');
    lines.push(`## Timeline`);
    lines.push('');
    for (const entry of postmortem.timeline) {
      lines.push(`- **${entry.timestamp.toISOString()}** — ${entry.action}${entry.actor ? ` (${entry.actor})` : ''}`);
    }
    lines.push('');
    lines.push(`## Decisions`);
    lines.push('');
    for (const dec of postmortem.decisions) {
      lines.push(`- **${dec.decision_type}**${dec.made_by ? ` by ${dec.made_by}` : ''}: ${JSON.stringify(dec.context)}`);
    }
    lines.push('');
    lines.push(`## Resolution`);
    lines.push('');
    lines.push(postmortem.resolution);
    lines.push('');
    lines.push(`## Lessons Learned`);
    lines.push('');
    for (const lesson of postmortem.lessons_learned) {
      lines.push(`- ${lesson}`);
    }
    lines.push('');
    lines.push(`## Preventive Measures`);
    lines.push('');
    for (const measure of postmortem.preventive_measures) {
      lines.push(`- ${measure}`);
    }

    return lines.join('\n');
  }

  /**
   * Store post-mortem to file
   */
  async storePostMortem(incident_id: string, postmortem: PostMortem): Promise<void> {
    fs.mkdirSync(this.baseDir, { recursive: true });
    const filePath = path.join(this.baseDir, `${incident_id}-postmortem.md`);
    const markdown = this.formatAsMarkdown(postmortem);
    fs.writeFileSync(filePath, markdown, 'utf-8');
  }

  private extractResolution(timeline: TimelineEntry[], decisions: Decision[]): string {
    const resolutionEntry = [...timeline].reverse().find(e =>
      e.action.includes('resolution') || e.action.includes('resolved') || e.action.includes('completed')
    );
    if (resolutionEntry) return `Resolved: ${resolutionEntry.action} — ${JSON.stringify(resolutionEntry.details)}`;

    const approvalDecision = decisions.find(d => d.decision_type.includes('approved') || d.decision_type.includes('resolution'));
    if (approvalDecision) return `Resolved via decision: ${approvalDecision.decision_type}`;

    return 'Resolution pending';
  }

  private generateLessonsLearned(_timeline: TimelineEntry[], _decisions: Decision[]): string[] {
    return [
      'Improve monitoring to detect issues earlier',
      'Add automated runbook execution for common failure modes',
      'Review incident response time and escalation procedures',
    ];
  }

  private generatePreventiveMeasures(_timeline: TimelineEntry[], _decisions: Decision[]): string[] {
    return [
      'Add alerting thresholds for early warning',
      'Implement automated scaling policies',
      'Create or update runbooks for this failure mode',
    ];
  }
}
