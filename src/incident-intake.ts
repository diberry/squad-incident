import { Incident } from './types';

/**
 * Parses an incident from GitHub issue data
 */
export async function parseIncidentFromIssue(issue: any): Promise<Incident> {
  const labels: string[] = Array.isArray(issue.labels)
    ? issue.labels.map((l: any) => (typeof l === 'string' ? l : l.name ?? ''))
    : [];

  const service = extractServiceFromLabelsOrTitle(labels, issue.title ?? '');
  const severity = extractSeverity(labels, issue.title ?? '');

  return {
    id: issue.id?.toString() ?? issue.number?.toString() ?? `inc-${Date.now()}`,
    title: issue.title ?? 'Untitled Incident',
    service,
    severity,
    description: issue.body ?? issue.description ?? '',
    createdAt: issue.created_at ? new Date(issue.created_at) : new Date(),
    issueUrl: issue.html_url ?? issue.url ?? '',
    labels,
  };
}

/**
 * Extracts service name from incident title or labels
 */
export function extractServiceName(incident: Incident): string {
  return extractServiceFromLabelsOrTitle(incident.labels, incident.title);
}

function extractServiceFromLabelsOrTitle(labels: string[], title: string): string {
  // Check labels for service:<name> pattern
  for (const label of labels) {
    const match = label.match(/^service:(.+)$/i);
    if (match) return match[1].trim();
  }

  // Check title for "Production: <Service>..." pattern
  const titleMatch = title.match(/^Production:\s*(\w+)/i);
  if (titleMatch) return titleMatch[1].toLowerCase();

  return 'unknown';
}

function extractSeverity(labels: string[], title: string): Incident['severity'] {
  for (const label of labels) {
    const match = label.match(/^severity:(.+)$/i);
    if (match) {
      const sev = match[1].trim().toLowerCase();
      if (['low', 'medium', 'high', 'critical'].includes(sev)) {
        return sev as Incident['severity'];
      }
    }
  }

  // Check title for severity keywords
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('critical') || lowerTitle.includes('p0')) return 'critical';
  if (lowerTitle.includes('high') || lowerTitle.includes('p1')) return 'high';
  if (lowerTitle.includes('low')) return 'low';

  return 'medium';
}
