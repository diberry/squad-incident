import { PostMortem, TimelineEntry } from './types';

export interface GitHubPublishAdapter {
  postIssueComment(issueUrl: string, body: string): Promise<void>;
}

export interface SlackPublishResult {
  ok: boolean;
  channel?: string;
}

/**
 * Publishes post-mortem to GitHub and optional Slack
 */
export class PostMortemPublisher {
  private githubAdapter?: GitHubPublishAdapter;

  constructor(adapter?: GitHubPublishAdapter) {
    this.githubAdapter = adapter;
  }

  /**
   * Publish post-mortem to GitHub
   */
  async publishToGitHub(incident_id: string, postmortem: PostMortem, issueUrl?: string): Promise<void> {
    const formatted = this.formatForPublishing(postmortem);
    if (this.githubAdapter && issueUrl) {
      await this.githubAdapter.postIssueComment(issueUrl, formatted.github);
    }
  }

  /**
   * Publish to Slack with webhook
   */
  async publishToSlack(postmortem: PostMortem, webhookUrl: string): Promise<SlackPublishResult> {
    const formatted = this.formatForPublishing(postmortem);
    // In production, this would POST to the webhook URL
    // For now, return success if webhook URL is provided
    if (!webhookUrl) {
      return { ok: false };
    }
    // Simulated Slack post — in production this would use fetch()
    return { ok: true, channel: 'incidents' };
  }

  /**
   * Format for readability and archival
   */
  formatForPublishing(postmortem: PostMortem): { github: string; slack: string } {
    const github = this.formatGitHub(postmortem);
    const slack = this.formatSlack(postmortem);
    return { github, slack };
  }

  /**
   * Extract lessons learned section
   */
  extractLessonsLearned(timeline: TimelineEntry[]): string[] {
    const lessons: string[] = [];

    const hasEscalation = timeline.some(e => e.action.includes('escalat'));
    if (hasEscalation) lessons.push('Escalation was required — review escalation triggers');

    const actionCount = timeline.length;
    if (actionCount > 5) lessons.push('Incident required many steps — consider automating common actions');

    lessons.push('Review monitoring and alerting for this failure mode');
    lessons.push('Update runbooks with findings from this incident');

    return lessons;
  }

  private formatGitHub(pm: PostMortem): string {
    const lines: string[] = [];
    lines.push(`## 📋 Post-Mortem: ${pm.incident_id}`);
    lines.push('');
    lines.push(`**Duration:** ${pm.duration_minutes} minutes`);
    lines.push(`**Resolution:** ${pm.resolution}`);
    lines.push('');
    lines.push('### Timeline');
    for (const e of pm.timeline) {
      lines.push(`- ${e.timestamp.toISOString()} — ${e.action}`);
    }
    lines.push('');
    lines.push('### Lessons Learned');
    for (const l of pm.lessons_learned) {
      lines.push(`- ${l}`);
    }
    lines.push('');
    lines.push('### Preventive Measures');
    for (const m of pm.preventive_measures) {
      lines.push(`- ${m}`);
    }
    return lines.join('\n');
  }

  private formatSlack(pm: PostMortem): string {
    const lines: string[] = [];
    lines.push(`*Post-Mortem: ${pm.incident_id}*`);
    lines.push(`Duration: ${pm.duration_minutes} min | Resolution: ${pm.resolution}`);
    lines.push('');
    lines.push('*Lessons Learned:*');
    for (const l of pm.lessons_learned) {
      lines.push(`• ${l}`);
    }
    return lines.join('\n');
  }
}
