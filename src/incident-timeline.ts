import { Incident, TimelineEntry } from './types';

/**
 * Records incident timeline with append-only log
 */
export class IncidentTimeline {
  /**
   * Record action to timeline
   */
  recordAction(
    incident_id: string,
    action: string,
    actor?: string,
    details?: Record<string, unknown>
  ): TimelineEntry {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Get timeline entries for incident
   */
  getTimeline(incident_id: string): TimelineEntry[] {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Persist timeline to .squad/incidents/
   */
  async persistTimeline(incident_id: string): Promise<void> {
    // TODO: Implementation
    throw new Error('Not implemented');
  }

  /**
   * Load timeline from file
   */
  async loadTimeline(incident_id: string): Promise<TimelineEntry[]> {
    // TODO: Implementation
    throw new Error('Not implemented');
  }
}
