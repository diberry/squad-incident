// Shared types for incident response system

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  createdAt: Date;
  issueUrl: string;
  labels: string[];
}

export interface IncidentSummary {
  what: string;
  where: string[];
  severity: string;
  likely_cause: string;
  affected_services: string[];
  code_references: CodeReference[];
}

export interface CodeReference {
  file: string;
  startLine?: number;
  endLine?: number;
  language?: string;
}

export interface DiagnosticResult {
  service: string;
  status: 'success' | 'failed' | 'partial';
  findings: string[];
  recommendations: string[];
  metadata?: Record<string, unknown>;
}

export interface DraftPR {
  title: string;
  body: string;
  branch_name: string;
  files: FileChange[];
  requires_approval: boolean;
  incident_id: string;
}

export interface FileChange {
  path: string;
  language: string;
  before: string;
  after: string;
  explanation: string;
}

export interface TimelineEntry {
  timestamp: Date;
  action: string;
  actor?: string;
  details: Record<string, unknown>;
}

export interface Decision {
  id: string;
  timestamp: Date;
  decision_type: string;
  context: Record<string, unknown>;
  made_by?: string;
}

export interface PostMortem {
  incident_id: string;
  incident_summary: IncidentSummary;
  timeline: TimelineEntry[];
  decisions: Decision[];
  resolution: string;
  duration_minutes: number;
  lessons_learned: string[];
  preventive_measures: string[];
}

export interface IncidentCoordinatorState {
  incident: Incident;
  summary?: IncidentSummary;
  diagnostics: Map<string, DiagnosticResult>;
  draft_pr?: DraftPR;
  timeline: TimelineEntry[];
  decisions: Decision[];
  status: 'intake' | 'investigating' | 'drafting' | 'awaiting_approval' | 'completed' | 'failed';
}
