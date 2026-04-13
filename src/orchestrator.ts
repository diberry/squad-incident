import * as fs from 'node:fs';
import * as path from 'node:path';
import { Incident, IncidentCoordinatorState } from './types';
import { IncidentCoordinator } from './incident-coordinator';
import { SummarizerAgent } from './summarizer-agent';
import { DiagnosticRouter } from './diagnostic-router';
import { FixPRDrafter } from './fix-pr-drafter';
import { IncidentTimeline } from './incident-timeline';
import { DecisionsLogger } from './decisions-logger';

/**
 * Orchestrates complete incident response workflow
 */
export class IncidentResponseOrchestrator {
  private checkpointDir: string;

  constructor(checkpointDir?: string) {
    this.checkpointDir = checkpointDir ?? '.squad/checkpoints';
  }

  /**
   * Run complete incident response workflow
   */
  async runWorkflow(incident: Incident): Promise<IncidentCoordinatorState> {
    const coordinator = new IncidentCoordinator(incident);
    coordinator.bootstrapTimeline();

    const timeline = new IncidentTimeline();
    const decisionsLogger = new DecisionsLogger();
    const summarizer = new SummarizerAgent();
    const diagnosticRouter = new DiagnosticRouter();
    const drafter = new FixPRDrafter();

    const state = coordinator.getState();

    // Step 1: Summarize
    try {
      timeline.recordAction(incident.id, 'summarization_started', 'orchestrator');
      const summary = await summarizer.generateSummary(incident);
      state.summary = summary;
      timeline.recordAction(incident.id, 'summary_generated', 'summarizer');
      decisionsLogger.recordDecision(incident.id, 'summary_approved', { summary: summary.what });
    } catch (error) {
      await this.handleError(error as Error, state);
    }

    // Step 2: Diagnostics
    try {
      timeline.recordAction(incident.id, 'diagnostics_started', 'orchestrator');
      const diagResults = await diagnosticRouter.routeToDiagnostics(incident);
      for (const result of diagResults) {
        state.diagnostics.set(result.service, result);
      }
      timeline.recordAction(incident.id, 'diagnostics_completed', 'diagnostic-router');
    } catch (error) {
      await this.handleError(error as Error, state);
    }

    // Step 3: Draft PR
    if (state.summary) {
      try {
        state.status = 'drafting';
        timeline.recordAction(incident.id, 'pr_drafting_started', 'orchestrator');
        const diagnostics = Array.from(state.diagnostics.values());
        const draftPR = await drafter.draftPR(incident, state.summary, diagnostics);
        state.draft_pr = draftPR;
        state.status = 'awaiting_approval';
        timeline.recordAction(incident.id, 'fix_drafted', 'pr-drafter');
        decisionsLogger.recordDecision(incident.id, 'pr_drafted', { pr_title: draftPR.title });
      } catch (error) {
        await this.handleError(error as Error, state);
      }
    }

    // Step 4: Record completion
    timeline.recordAction(incident.id, 'workflow_completed', 'orchestrator');
    state.timeline = timeline.getTimeline(incident.id);
    state.decisions = decisionsLogger.getDecisions(incident.id);

    if (state.status !== 'failed') {
      state.status = state.draft_pr ? 'awaiting_approval' : 'completed';
    }

    await this.saveCheckpoint(state);

    return state;
  }

  /**
   * Handle errors gracefully
   */
  async handleError(error: Error, state: IncidentCoordinatorState): Promise<void> {
    state.timeline.push({
      timestamp: new Date(),
      action: 'error_occurred',
      actor: 'orchestrator',
      details: { error: error.message },
    });
    // Don't set status to failed — allow continuing with available data
  }

  /**
   * Support workflow checkpoints
   */
  async saveCheckpoint(state: IncidentCoordinatorState): Promise<void> {
    fs.mkdirSync(this.checkpointDir, { recursive: true });
    const filePath = path.join(this.checkpointDir, `${state.incident.id}.json`);

    const serializable = {
      ...state,
      diagnostics: Object.fromEntries(state.diagnostics),
      incident: {
        ...state.incident,
        createdAt: state.incident.createdAt.toISOString(),
      },
      timeline: state.timeline.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
      decisions: state.decisions.map(d => ({
        ...d,
        timestamp: d.timestamp.toISOString(),
      })),
    };
    fs.writeFileSync(filePath, JSON.stringify(serializable, null, 2), 'utf-8');
  }

  /**
   * Resume from checkpoint
   */
  async resumeFromCheckpoint(incident_id: string): Promise<IncidentCoordinatorState> {
    const filePath = path.join(this.checkpointDir, `${incident_id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`No checkpoint found for incident ${incident_id}`);
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return {
      ...raw,
      incident: {
        ...raw.incident,
        createdAt: new Date(raw.incident.createdAt),
      },
      diagnostics: new Map(Object.entries(raw.diagnostics ?? {})),
      timeline: (raw.timeline ?? []).map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      })),
      decisions: (raw.decisions ?? []).map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp),
      })),
    };
  }
}
