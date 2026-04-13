import { Incident, IncidentSummary } from './types';

/**
 * Summarizer agent that generates incident summaries
 */
export class SummarizerAgent {
  /**
   * Generate incident summary
   */
  async generateSummary(incident: Incident): Promise<IncidentSummary> {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Detect severity from incident metadata
   */
  detectSeverity(incident: Incident): string {
    // TODO: Implementation
    throw new Error('Not implemented');
  }
}
