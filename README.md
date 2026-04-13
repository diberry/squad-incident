# Squad SDK Incident Response Example

A reference implementation demonstrating how Squad SDK patterns can structure incident response workflows. It shows how to auto-summarize production incidents, route diagnostics through service-specific runbooks, generate template-based fix suggestions, and produce post-incident reviews. Designed as a learning resource for SRE teams exploring multi-agent orchestration patterns.

> **Note:** This project generates template-based suggestions, not automated code fixes. All "PR drafts" are structured triage reports that require human review and manual implementation.

## Features (P0 MVP)

- **Issue-based incident intake**: Create a GitHub issue describing an incident; the system auto-parses severity and service metadata
- **Incident summarization**: AI agent analyzes issue + relevant code context to produce structured incident summary (what, where, why)
- **Runbook-driven diagnostics**: Load service-specific runbooks as reusable skills; route incidents to appropriate diagnostic agents
- **Template-based fix suggestions**: Generate structured triage reports with recommended changes based on diagnostic results (human implementation required)
- **Incident timeline**: Append-only audit log of all actions, decisions, and approvals
- **Post-mortem generation**: Auto-generate incident post-mortem from timeline + decisions + lessons learned

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Incident Response Workflow                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] Incident Intake          [2] Summarization               │
│  ─────────────────            ────────────────                │
│  GitHub Issue                 • Parse code context             │
│  │                            • Extract metadata               │
│  ├─ Extract service name      • Generate summary               │
│  ├─ Extract severity          └─→ IncidentSummary             │
│  └─→ Incident object              │                           │
│                                    │                           │
│  [3] Diagnostic Routing        [4] Fix Suggestions             │
│  ─────────────────────        ───────────────────             │
│  • Match service to runbook    • Template-based suggestions    │
│  • Load skill per service      • Structured triage report      │
│  • Run in parallel             • Human review required         │
│  └─→ DiagnosticResults        └─→ DraftPR (needs human impl)  │
│                                                                 │
│  [5] Timeline & Decisions      [6] Post-Mortem               │
│  ─────────────────────         ──────────────               │
│  • Record all actions          • Aggregate timeline           │
│  • Track approvals             • Generate markdown            │
│  • Persist to .squad/          • Calculate duration           │
│  └─→ IncidentTimeline         └─→ Post-mortem.md             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## SDK Modules Used

| Module | Purpose | Status |
|--------|---------|--------|
| `platform.createPlatformAdapter()` | Create issues, PRs, labels on GitHub/ADO | ✅ Solid |
| `skills.SkillRegistry` | Load service-specific runbooks as callable skills | ✅ Solid |
| `builders.defineRouting()` | Route incidents by service name to specialist agents | ✅ Solid |
| `state.DecisionsCollection` | Record decisions for audit trail + post-mortem | ✅ Solid |
| `runtime.EventBus` | In-process event stream for agent coordination | ⚠️ In-process only |

## Project Structure

```
src/
├── types.ts                       # Shared types (Incident, IncidentSummary, DraftPR, etc)
├── index.ts                       # Main exports
├── incident-intake.ts            # Phase 1: Parse incidents from GitHub issues
├── incident-coordinator.ts       # Phase 1: Orchestrate per-incident workflows
├── summarizer-agent.ts           # Phase 2: Generate incident summaries
├── code-context.ts               # Phase 2: Fetch relevant code snippets
├── runbook-registry.ts           # Phase 3: Load service-specific runbooks
├── diagnostic-router.ts          # Phase 3: Route to diagnostic agents by service
├── fix-pr-drafter.ts             # Phase 4: Generate triage reports as PR templates
├── pr-changes.ts                 # Phase 4: Template-based change suggestions
├── incident-timeline.ts          # Phase 5: Record append-only action log
├── decisions-logger.ts           # Phase 5: Log key decisions with metadata
├── post-mortem-generator.ts      # Phase 6: Generate post-incident reviews
├── post-mortem-publisher.ts      # Phase 6: Publish post-mortems to GitHub
├── orchestrator.ts               # Phase 7: End-to-end incident workflow
├── skills/
│   ├── api-runbook.md            # Example runbook for API service diagnostics
│   ├── database-runbook.md       # Example runbook for database diagnostics
│   └── config.ts                 # Runbook loader config
└── test/                         # TDD test files (one per feature)
    ├── *.test.ts
    └── fixtures/
```

## Installation & Setup

See **[QUICKSTART.md](./QUICKSTART.md)** for step-by-step setup and your first incident response walkthrough.

### Quick Commands

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript → dist/
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once and exit
```

## Example: Configure a Runbook Skill

Runbooks are loaded as reusable skills. Here's an example API service runbook:

**`skills/api-runbook.md`:**
```markdown
# API Service Runbook

## Diagnostic Steps
1. Check API error logs for the last 5 minutes
2. Query metrics: request latency, error rate, CPU usage
3. Inspect recent deployments
4. Check upstream service health

## Recommended Fixes
- If latency spike: scale horizontally, check database queries
- If error rate spike: check circuit breaker status, inspect logs
- If deployment-related: rollback or fix code
```

**Load in coordinator:**
```typescript
const registry = new RunbookRegistry();
registry.load('./skills/'); // Loads *.md files as skills

const coordinator = new IncidentCoordinator(incident, registry);
await coordinator.run(); // Routes to API runbook if service==="api"
```

## Development Flow (TDD)

This project follows **Test-Driven Development** organized into 7 phases:

1. **Read PLAN.md** → understand the feature requirements
2. **Write the test** → `test/{feature}.test.ts` (given/when/then structure)
3. **Implement the code** → `src/{feature}.ts`
4. **Run tests** → verify all pass
5. **Repeat** for next feature

Each phase builds on prior ones (Phase 2 uses Phase 1 outputs, etc.).

## Configuration

### Environment Variables

```bash
# GitHub platform adapter
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo

# Optional: Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### SDK Configuration

```typescript
import { createPlatformAdapter } from '@bradygaster/squad-sdk';

const platform = createPlatformAdapter('github', {
  owner: process.env.GITHUB_OWNER,
  repo: process.env.GITHUB_REPO,
});

const orchestrator = new IncidentResponseOrchestrator(platform, registry);
```

## License

MIT
