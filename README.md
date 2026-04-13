# Squad SDK Incident Response Example

A reference implementation demonstrating how to structure incident response workflows using Squad SDK patterns. This example shows how to intake incidents, auto-summarize them, route diagnostics through service-specific runbooks, generate triage reports, and produce post-incident reviews.

## Using This Example

### Installation

```bash
npm install
npm run build
```

### 1. Create an Incident Report (JSON)

Create a file describing your incident:

```json
// incident-report.json
{
  "id": "123",
  "title": "Production: API latency spike detected",
  "service": "api",
  "severity": "high",
  "description": "Started at 14:32 UTC. Latency went from 50ms to 500ms.",
  "createdAt": "2024-01-15T14:35:00Z",
  "issueUrl": "https://github.com/your-org/your-repo/issues/123",
  "labels": ["service:api", "severity:high"]
}
```

Or parse from a GitHub issue:

```typescript
import { parseIncidentFromIssue } from './src/index';

const gitHubIssue = await platform.getIssue(123);
const incident = parseIncidentFromIssue(gitHubIssue);
```

### 2. Add Runbook Skills (Markdown)

Create service-specific runbooks in `skills/`:

```markdown
// skills/api-runbook.md
# API Service Runbook

## Diagnostic Steps
1. Check API error logs for the last 5 minutes
2. Query metrics: request latency, error rate, CPU usage
3. Inspect recent deployments
4. Check upstream service health

## Recommended Fixes
- If latency spike: scale horizontally, check database queries
- If error rate spike: check circuit breaker status, inspect logs
```

The system automatically discovers and loads all `.md` files from the `skills/` directory.

### 3. Run the CLI

```bash
npm run build

# Full orchestration
npx squad-incident run incident-report.json

# Just produce a summary
npx squad-incident summarize incident-report.json

# Generate a post-mortem
npx squad-incident postmortem incident-report.json
```

**Expected output (run):**

```
✅ Incident intake complete
   ID: 123
   Service: api
   Severity: high

📋 Status: awaiting_approval
📝 Summary: ...
📅 Timeline entries: 7
📄 Decisions: 2
🔧 Draft PR: fix: resolve incident 123 — ...

Done.
```

### 4. Read the Outputs

The orchestrator generates three key outputs:

1. **`{incident-id}-summary.json`** — Incident summary (what, where, why)
   ```json
   {
     "what": "API latency spike: response time increased from 50ms to 500ms+",
     "where": ["api", "orders-list-endpoint"],
     "severity": "high",
     "likely_cause": "Recent deployment introduced N+1 query",
     "affected_services": ["api", "database"],
     "code_references": [...]
   }
   ```

2. **`{incident-id}-timeline.json`** — Append-only action log
   ```json
   [
     { "timestamp": "...", "action": "incident_created", "details": {...} },
     { "timestamp": "...", "action": "summary_generated", "details": {...} },
     { "timestamp": "...", "action": "diagnostics_complete", "details": {...} },
     { "timestamp": "...", "action": "pr_drafted", "details": {...} }
   ]
   ```

3. **`{incident-id}-post-mortem.md`** — Human-readable post-mortem
   ```markdown
   # Post-Mortem: Production API Latency Spike

   **Duration:** 3 minutes  
   **Services Affected:** api, database  

   ## Timeline
   - 14:32:00 - Latency spike detected
   - 14:32:15 - Summary generated
   - 14:32:30 - Diagnostics identified N+1 query
   - 14:35:00 - Incident resolved

   ## Lessons Learned
   - Add integration tests for batch queries
   - Implement automated query performance monitoring
   ```

## Extending This Example

### Adding Custom Runbook Skills

1. Create a new markdown file in `skills/`:
   ```markdown
   // skills/payment-gateway-runbook.md
   # Payment Gateway Runbook
   
   ## Diagnostic Steps
   ...
   ```

2. The `RunbookRegistry` automatically discovers and loads it by service name.

3. Route incidents by updating the service matching logic in `diagnostic-router.ts`.

### Integrating with Real GitHub Issues

1. Set environment variables:
   ```bash
   export GITHUB_TOKEN=ghp_...
   export GITHUB_OWNER=your-org
   export GITHUB_REPO=your-repo
   ```

2. Parse incidents from issues:
   ```typescript
   const platform = createPlatformAdapter('github', {
     owner: process.env.GITHUB_OWNER,
     repo: process.env.GITHUB_REPO,
     token: process.env.GITHUB_TOKEN,
   });

   const gitHubIssue = await platform.getIssue(123);
   const incident = parseIncidentFromIssue(gitHubIssue);
   ```

3. The orchestrator automatically publishes post-mortems back to GitHub.

### Programmatic API

Use the SDK modules directly for fine-grained control:

```typescript
import {
  SummarizerAgent,
  DiagnosticRouter,
  FixPRDrafter,
  IncidentTimeline,
  PostMortemGenerator,
} from './src/index';

// Summarize
const summarizer = new SummarizerAgent();
const summary = await summarizer.generateSummary(incident);

// Diagnose
const router = new DiagnosticRouter();
const diagnostics = await router.routeToDiagnostics(incident);

// Draft fixes
const drafter = new FixPRDrafter();
const draftPR = await drafter.draftPR(incident, summary, diagnostics);

// Record timeline
const timeline = new IncidentTimeline();
timeline.recordAction(incident.id, 'incident_created', 'script', { detected_at: new Date().toISOString() });

// Generate post-mortem
const pmgen = new PostMortemGenerator();
const postmortem = await pmgen.generatePostMortem(incident.id, timeline.getTimeline(incident.id), []);
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Incident Response Workflow                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] Incident Intake      [2] Summarization                   │
│      ↓                         ↓                               │
│  Parse from GitHub        AI analyzes context                 │
│  or JSON                  → IncidentSummary                   │
│                                ↓                               │
│  [3] Diagnostic Routing   [4] Fix Suggestions                 │
│      ↓                         ↓                               │
│  Load runbooks            Template-based triage               │
│  Match service            Requires human review               │
│      ↓                         ↓                               │
│  [5] Timeline & Decisions [6] Post-Mortem                     │
│      ↓                         ↓                               │
│  Record all actions       Generate markdown                   │
│  Audit trail              Share learnings                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── cli/
│   └── main.ts                    # CLI entry point (run, summarize, postmortem)
├── types.ts                       # Shared types (Incident, IncidentSummary, etc)
├── index.ts                       # Main exports
├── incident-intake.ts             # Parse incidents from GitHub issues
├── incident-coordinator.ts        # Orchestrate per-incident workflows
├── summarizer-agent.ts            # Generate incident summaries
├── code-context.ts                # Fetch relevant code snippets
├── runbook-registry.ts            # Load and manage service runbooks
├── diagnostic-router.ts           # Route incidents to diagnostic agents
├── fix-pr-drafter.ts              # Generate triage reports
├── pr-changes.ts                  # Template-based change suggestions
├── incident-timeline.ts           # Append-only action log
├── decisions-logger.ts            # Log decisions with metadata
├── post-mortem-generator.ts       # Generate post-incident reviews
├── post-mortem-publisher.ts       # Publish post-mortems to GitHub
├── orchestrator.ts                # End-to-end incident workflow
└── skills/                        # Service-specific runbooks
    ├── api-runbook.md
    ├── database-runbook.md
    └── config.ts
```

## SDK Modules Used

| Module | Purpose |
|--------|---------|
| `platform.createPlatformAdapter()` | Create issues, PRs, comments on GitHub |
| `skills.SkillRegistry` | Load and call service-specific runbooks |
| `builders.defineRouting()` | Route incidents by service name |
| `state.DecisionsCollection` | Record decisions for audit trail |
| `runtime.EventBus` | In-process event coordination |

## Testing

```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once and exit
```

Tests are organized by feature in `test/` directory, following TDD structure in **[PLAN.md](./PLAN.md)**.

## Roadmap

- [ ] Multi-workspace support (route to different Slack channels)
- [ ] Real-time metrics integration (Datadog, New Relic)
- [ ] Incident correlation (detect related incidents)
- [ ] Auto-escalation workflow (critical incidents → on-call)
- [ ] Custom decision frameworks (approve fixes automatically)

## License

MIT
