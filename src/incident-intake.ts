import { Incident } from './types';

/**
 * Parses an incident from GitHub issue data
 * @param issue GitHub issue object
 * @returns Parsed Incident
 */
export async function parseIncidentFromIssue(issue: any): Promise<Incident> {
  // TODO: Implementation
  throw new Error('Not implemented');
}

/**
 * Extracts service name from incident title or labels
 * @param incident Incident object
 * @returns Service name
 */
export function extractServiceName(incident: Incident): string {
  // TODO: Implementation
  throw new Error('Not implemented');
}
