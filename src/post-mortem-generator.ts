import { PostMortem, TimelineEntry, Decision } from './types';

/**
 * Generates post-mortem from incident timeline and decisions
 */
export class PostMortemGenerator {
  /**
   * Generate post-mortem from timeline and decisions
   */
  async generatePostMortem(
    incident_id: string,
    timeline: TimelineEntry[],
    decisions: Decision[]
  ): Promise<PostMortem> {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Calculate incident duration
   */
  calculateDuration(timeline: TimelineEntry[]): number {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Format post-mortem as markdown
   */
  formatAsMarkdown(postmortem: PostMortem): string {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Store post-mortem to file
   */
  async storePostMortem(incident_id: string, postmortem: PostMortem): Promise<void> {
    // TODO: Implementation
    throw new Error('Not implemented');
  }
}
