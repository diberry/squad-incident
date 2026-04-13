import { Decision } from './types';

/**
 * Logs key decisions for incidents
 */
export class DecisionsLogger {
  private decisions: Map<string, Decision[]> = new Map();
  private timelineLinks: Map<string, string> = new Map();
  private counter = 0;

  /**
   * Log a decision
   */
  recordDecision(
    incident_id: string,
    decision_type: string,
    context: Record<string, unknown>,
    made_by?: string
  ): Decision {
    const decision: Decision = {
      id: `dec-${++this.counter}`,
      timestamp: new Date(),
      decision_type,
      context,
      made_by,
    };

    if (!this.decisions.has(incident_id)) {
      this.decisions.set(incident_id, []);
    }
    this.decisions.get(incident_id)!.push(decision);

    return decision;
  }

  /**
   * Get decisions for incident
   */
  getDecisions(incident_id: string): Decision[] {
    return this.decisions.get(incident_id) ?? [];
  }

  /**
   * Link decision to timeline event
   */
  linkToTimeline(decision: Decision, timeline_entry_id: string): void {
    this.timelineLinks.set(decision.id, timeline_entry_id);
    decision.context = { ...decision.context, timeline_entry_id };
  }

  /**
   * Get decisions with context
   */
  getDecisionsWithContext(incident_id: string): Map<string, Decision> {
    const result = new Map<string, Decision>();
    const decs = this.decisions.get(incident_id) ?? [];
    for (const dec of decs) {
      const enriched = { ...dec };
      const timelineLink = this.timelineLinks.get(dec.id);
      if (timelineLink) {
        enriched.context = { ...enriched.context, timeline_entry_id: timelineLink };
      }
      result.set(dec.id, enriched);
    }
    return result;
  }
}
