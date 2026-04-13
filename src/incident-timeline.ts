import * as fs from 'node:fs';
import * as path from 'node:path';
import { TimelineEntry } from './types';

/**
 * Records incident timeline with append-only log
 */
export class IncidentTimeline {
  private timelines: Map<string, TimelineEntry[]> = new Map();
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? '.squad/incidents';
  }

  /**
   * Record action to timeline
   */
  recordAction(
    incident_id: string,
    action: string,
    actor?: string,
    details?: Record<string, unknown>
  ): TimelineEntry {
    const entry: TimelineEntry = {
      timestamp: new Date(),
      action,
      actor,
      details: details ?? {},
    };

    if (!this.timelines.has(incident_id)) {
      this.timelines.set(incident_id, []);
    }
    this.timelines.get(incident_id)!.push(entry);

    return entry;
  }

  /**
   * Get timeline entries for incident (returns a copy)
   */
  getTimeline(incident_id: string): TimelineEntry[] {
    const entries = this.timelines.get(incident_id);
    if (!entries) return [];
    return entries.map(e => ({ ...e, details: { ...e.details } }));
  }

  /**
   * Persist timeline to .squad/incidents/
   */
  async persistTimeline(incident_id: string): Promise<void> {
    const entries = this.timelines.get(incident_id);
    if (!entries) return;

    fs.mkdirSync(this.baseDir, { recursive: true });
    const filePath = path.join(this.baseDir, `${incident_id}.json`);
    const serialized = entries.map(e => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    }));
    fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), 'utf-8');
  }

  /**
   * Load timeline from file
   */
  async loadTimeline(incident_id: string): Promise<TimelineEntry[]> {
    const filePath = path.join(this.baseDir, `${incident_id}.json`);
    if (!fs.existsSync(filePath)) return [];

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entries: TimelineEntry[] = raw.map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));

    this.timelines.set(incident_id, entries);
    return entries;
  }
}
