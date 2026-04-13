import { Decision } from './types';

/**
 * Logs key decisions for incidents
 */
export class DecisionsLogger {
  /**
   * Log a decision
   */
  recordDecision(
    incident_id: string,
    decision_type: string,
    context: Record<string, unknown>,
    made_by?: string
  ): Decision {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Get decisions for incident
   */
  getDecisions(incident_id: string): Decision[] {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Link decision to timeline event
   */
  linkToTimeline(decision: Decision, timeline_entry_id: string): void {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Get decisions with context
   */
  getDecisionsWithContext(incident_id: string): Map<string, Decision> {
    // TODO: Implementation
    throw new Error('Not implemented');
  }
}
