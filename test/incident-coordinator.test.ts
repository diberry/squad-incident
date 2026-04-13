import { describe, it, expect, beforeEach } from 'vitest';
import { IncidentCoordinator } from '../src/incident-coordinator';
import { Incident } from '../src/types';

describe('Incident Coordinator', () => {
  let coordinator: IncidentCoordinator;
  let sampleIncident: Incident;

  beforeEach(() => {
    sampleIncident = {
      id: 'inc-001',
      title: 'Production: Database CPU 95%',
      service: 'database',
      severity: 'critical',
      description: 'Database server CPU utilization critical',
      createdAt: new Date(),
      issueUrl: 'https://github.com/example/repo/issues/42',
      labels: ['service:database', 'severity:critical']
    };
  });

  describe('initialization', () => {
    it('should initialize incident coordinator', () => {
      coordinator = new IncidentCoordinator(sampleIncident);
      const state = coordinator.getState();
      expect(state.incident).toEqual(sampleIncident);
      expect(state.status).toBe('intake');
      expect(state.timeline).toHaveLength(0);
      expect(state.decisions).toHaveLength(0);
    });

    it('should bootstrap incident timeline on creation', () => {
      coordinator = new IncidentCoordinator(sampleIncident);
      coordinator.bootstrapTimeline();
      const state = coordinator.getState();
      expect(state.timeline).toHaveLength(1);
      expect(state.timeline[0].action).toBe('incident_created');
      expect(state.timeline[0].actor).toBe('system');
      expect(state.status).toBe('investigating');
    });

    it('should route incident to summarizer and fix agents', async () => {
      coordinator = new IncidentCoordinator(sampleIncident);
      coordinator.bootstrapTimeline();
      await coordinator.routeIncident();
      const state = coordinator.getState();
      expect(state.timeline.length).toBeGreaterThanOrEqual(2);
      expect(state.timeline.some(e => e.action === 'routing_started')).toBe(true);
    });
  });

  describe('state management', () => {
    it('should return current coordinator state', () => {
      coordinator = new IncidentCoordinator(sampleIncident);
      const state = coordinator.getState();
      expect(state).toBeDefined();
      expect(state.incident.id).toBe('inc-001');
      expect(state.diagnostics).toBeInstanceOf(Map);
    });

    it('should track investigation progress', () => {
      coordinator = new IncidentCoordinator(sampleIncident);
      expect(coordinator.getState().status).toBe('intake');
      coordinator.bootstrapTimeline();
      expect(coordinator.getState().status).toBe('investigating');
    });
  });
});
