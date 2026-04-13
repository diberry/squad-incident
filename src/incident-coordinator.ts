import { Incident, IncidentCoordinatorState, TimelineEntry } from './types';

/**
 * Coordinates incident response workflow
 */
export class IncidentCoordinator {
  private state: IncidentCoordinatorState;

  constructor(incident: Incident) {
    this.state = {
      incident,
      diagnostics: new Map(),
      timeline: [],
      decisions: [],
      status: 'intake',
    };
  }

  /**
   * Initialize incident timeline
   */
  bootstrapTimeline(): void {
    const entry: TimelineEntry = {
      timestamp: new Date(),
      action: 'incident_created',
      actor: 'system',
      details: {
        incident_id: this.state.incident.id,
        service: this.state.incident.service,
        severity: this.state.incident.severity,
      },
    };
    this.state.timeline.push(entry);
    this.state.status = 'investigating';
  }

  /**
   * Route incident to summarizer and fix agents
   */
  async routeIncident(): Promise<void> {
    this.state.timeline.push({
      timestamp: new Date(),
      action: 'routing_started',
      actor: 'coordinator',
      details: { service: this.state.incident.service },
    });

    // Mark routing targets
    this.state.status = 'investigating';
  }

  /**
   * Get current coordinator state
   */
  getState(): IncidentCoordinatorState {
    return { ...this.state };
  }
}
