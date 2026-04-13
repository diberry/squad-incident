#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Incident } from '../types';
import { IncidentResponseOrchestrator } from '../orchestrator';
import { SummarizerAgent } from '../summarizer-agent';
import { PostMortemGenerator } from '../post-mortem-generator';
import { IncidentTimeline } from '../incident-timeline';
import { DecisionsLogger } from '../decisions-logger';

function usage(): void {
  console.log(`Usage: squad-incident <command> <incident.json>

Commands:
  run <file>         Run full incident orchestration
  summarize <file>   Generate an incident summary
  postmortem <file>  Generate a post-mortem from the timeline
`);
}

function loadIncident(filePath: string): Incident {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: file not found — ${resolved}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    labels: raw.labels ?? [],
  };
}

async function runCommand(file: string): Promise<void> {
  const incident = loadIncident(file);
  console.log(`\n✅ Incident intake complete`);
  console.log(`   ID: ${incident.id}`);
  console.log(`   Service: ${incident.service}`);
  console.log(`   Severity: ${incident.severity}\n`);

  const orchestrator = new IncidentResponseOrchestrator();
  const state = await orchestrator.runWorkflow(incident);

  console.log(`📋 Status: ${state.status}`);
  if (state.summary) {
    console.log(`📝 Summary: ${state.summary.what}`);
  }
  console.log(`📅 Timeline entries: ${state.timeline.length}`);
  console.log(`📄 Decisions: ${state.decisions.length}`);
  if (state.draft_pr) {
    console.log(`🔧 Draft PR: ${state.draft_pr.title}`);
  }
  console.log(`\nDone.`);
}

async function summarizeCommand(file: string): Promise<void> {
  const incident = loadIncident(file);
  const summarizer = new SummarizerAgent();
  const summary = await summarizer.generateSummary(incident);

  console.log(`\n📝 Incident Summary`);
  console.log(`   What: ${summary.what}`);
  console.log(`   Where: ${summary.where.join(', ')}`);
  console.log(`   Severity: ${summary.severity}`);
  console.log(`   Likely cause: ${summary.likely_cause}`);
  console.log(`   Affected services: ${summary.affected_services.join(', ')}`);
  if (summary.code_references.length > 0) {
    console.log(`   Code refs: ${summary.code_references.map(r => r.file).join(', ')}`);
  }

  const outPath = `${incident.id}-summary.json`;
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n📁 Written to ${outPath}`);
}

async function postmortemCommand(file: string): Promise<void> {
  const incident = loadIncident(file);
  const timeline = new IncidentTimeline();
  const decisionsLogger = new DecisionsLogger();

  // Build a minimal timeline from the incident itself
  timeline.recordAction(incident.id, 'incident_created', 'cli', {
    service: incident.service,
    severity: incident.severity,
    description: incident.title,
  });
  timeline.recordAction(incident.id, 'postmortem_requested', 'cli');

  const entries = timeline.getTimeline(incident.id);
  const decisions = decisionsLogger.getDecisions(incident.id);

  const generator = new PostMortemGenerator();
  const postmortem = await generator.generatePostMortem(incident.id, entries, decisions);
  const markdown = generator.formatAsMarkdown(postmortem);

  const outPath = `${incident.id}-post-mortem.md`;
  fs.writeFileSync(outPath, markdown, 'utf-8');
  console.log(`\n📄 Post-mortem written to ${outPath}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    usage();
    process.exit(1);
  }

  const [command, file] = args;

  switch (command) {
    case 'run':
      await runCommand(file);
      break;
    case 'summarize':
      await summarizeCommand(file);
      break;
    case 'postmortem':
      await postmortemCommand(file);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      usage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
