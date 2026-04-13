# QUICKSTART: Incident Response in 10 Minutes

Get started with the Squad SDK Incident Response example.

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** 9+ (included with Node.js)
- **Git**

## Setup

```bash
# Clone and install
git clone <repo-url> squad-incident-example
cd squad-incident-example

npm install
npm run build
```

Verify the build succeeded:

```bash
npm run test:run
# Expected: All tests pass
```

## Step 1: Explore the Sample Inputs

The project ships with example files you can use immediately:

- `examples/incident.json` — a sample incident report
- `examples/runbooks/database.md` — a sample service runbook

## Step 2: Run the CLI

```bash
# Full orchestration
npx squad-incident run examples/incident.json

# Just produce a summary
npx squad-incident summarize examples/incident.json

# Generate a post-mortem
npx squad-incident postmortem examples/incident.json
```

**Expected output (run):**

```
✅ Incident intake complete
   ID: incident-001
   Service: database
   Severity: high

📋 Status: awaiting_approval
📝 Summary: Production: API latency spike detected: ...
📅 Timeline entries: 7
📄 Decisions: 2
🔧 Draft PR: fix: resolve incident incident-001 — ...

Done.
```

## Step 3: Review the Outputs

The `run` command saves a checkpoint to `.squad/checkpoints/`.
The `summarize` command writes `<id>-summary.json` to the current directory.
The `postmortem` command writes `<id>-post-mortem.md` to the current directory.

## What's Next?

### Add More Runbooks

Create `skills/database-runbook.md`, `skills/cache-runbook.md`, etc. The orchestrator automatically discovers and routes to them.

### Integrate with GitHub

```bash
export GITHUB_TOKEN=ghp_...
export GITHUB_OWNER=your-org
export GITHUB_REPO=your-repo
```

Then modify `incident.json` to parse from a real GitHub issue instead of JSON.

### Automate with GitHub Actions

Create `.github/workflows/incident-response.yml`:

```yaml
name: Incident Response
on:
  issues:
    types: [opened]

jobs:
  respond:
    runs-on: ubuntu-latest
    if: contains(github.event.issue.title, '[incident]')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install && npm run build
      - run: npx squad-incident run incident.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Use the Programmatic API

```typescript
import {
  SummarizerAgent,
  DiagnosticRouter,
  IncidentTimeline,
} from './src/index';

const summarizer = new SummarizerAgent();
const summary = await summarizer.generateSummary(incident);

const router = new DiagnosticRouter();
const diagnostics = await router.routeToDiagnostics(incident);

const timeline = new IncidentTimeline();
timeline.recordAction(incident.id, 'incident_created', 'script');
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm install` fails | Check Node.js version: `node --version` (need 18+) |
| `npm run build` fails | Run `npx tsc --noEmit` to see TypeScript errors |
| Orchestrator crashes | Ensure `incident.json` is valid JSON |
| Tests fail | Run `npm run test` to see detailed error messages |
| `GITHUB_TOKEN` error | Export it: `export GITHUB_TOKEN=ghp_...` |

## Learn More

- **[README.md](./README.md)** — Full architecture and extending guide
- **[PLAN.md](./PLAN.md)** — TDD implementation plan
- **[src/types.ts](./src/types.ts)** — All shared types
- **[Squad SDK Docs](https://github.com/bradygaster/squad)** — Core SDK reference
