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

## Step 1: Create an Incident JSON File

Create `incident.json` in the project root:

```json
{
  "id": "incident-001",
  "title": "Production: API latency spike detected",
  "service": "api",
  "severity": "high",
  "description": "API endpoint /api/orders/list experiencing 500ms+ latency. Deployed 10 minutes before incident. Error rate at 0%, latency spike at 14:32 UTC.",
  "createdAt": "2024-01-15T14:35:00Z",
  "issueUrl": "https://github.com/example/repo/issues/123",
  "labels": ["service:api", "severity:high"]
}
```

## Step 2: Add a Runbook Skill

Create `skills/api-runbook.md`:

```markdown
# API Service Runbook

## Diagnostic Checklist
- [ ] Check error logs (last 5 minutes)
- [ ] Query request latency metrics (p50, p95, p99)
- [ ] Check recent deployments
- [ ] Verify upstream dependencies
- [ ] Check database connection pool

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|------------|-----|
| Latency spike + recent deploy | Code regression | Rollback or fix query |
| 500ms+ p99 | N+1 query problem | Batch queries or eager load |
| Connection pool exhausted | Too many concurrent requests | Scale pool or add circuit breaker |

## Escalation
If not resolved in 15 minutes, page on-call database engineer.
```

## Step 3: Run the Orchestrator

```bash
npx ts-node -T src/orchestrator.ts incident.json
```

**Expected output:**

```
✅ Incident intake complete
  - ID: incident-001
  - Service: api
  - Severity: high

📝 Generating summary...
✅ Summary generated

🔍 Running diagnostics...
✅ Diagnostics: 3 findings, 2 recommendations

📋 Drafting triage report...
✅ Triage report ready (requires human review)

📅 Recording timeline...
✅ Timeline recorded

📄 Generating post-mortem...
✅ Post-mortem generated

📁 Outputs written to:
   - incident-001-summary.json
   - incident-001-timeline.json
   - incident-001-post-mortem.md
```

## Step 4: Review the Outputs

Three files are generated:

### 1. Summary (`incident-001-summary.json`)

```json
{
  "what": "API latency spike: response time increased from 50ms to 500ms+",
  "where": ["api", "orders-list-endpoint"],
  "severity": "high",
  "likely_cause": "Recent deployment (commit abc1234) introduced N+1 query in /api/orders/list",
  "affected_services": ["api", "database"],
  "code_references": [
    { "file": "src/handlers/orders.ts", "startLine": 45, "endLine": 62 }
  ]
}
```

### 2. Timeline (`incident-001-timeline.json`)

```json
[
  {
    "timestamp": "2024-01-15T14:35:00Z",
    "action": "incident_created",
    "details": { "service": "api", "severity": "high" }
  },
  {
    "timestamp": "2024-01-15T14:35:02Z",
    "action": "summary_generated",
    "details": { "duration_ms": 2500 }
  },
  {
    "timestamp": "2024-01-15T14:35:03Z",
    "action": "diagnostics_complete",
    "details": { "service": "api", "findings": 3, "recommendations": 2 }
  },
  {
    "timestamp": "2024-01-15T14:35:05Z",
    "action": "pr_drafted",
    "details": { "branch": "fix/incident-001-api-latency" }
  }
]
```

### 3. Post-Mortem (`incident-001-post-mortem.md`)

```markdown
# Post-Mortem: Production API Latency Spike

**Incident ID:** incident-001  
**Duration:** 3 minutes  
**Affected Services:** api, database  
**Severity:** high  

## Timeline

| Time | Action | Details |
|------|--------|---------|
| 14:32:00 | Latency spike detected | p95: 50ms → 500ms |
| 14:35:00 | Incident reported | Issue created |
| 14:35:02 | Analysis complete | N+1 query identified |
| 14:35:05 | Triage report ready | Awaiting human review |

## Root Cause

Recent deployment introduced N+1 query loop in `/api/orders/list` handler.

## Lessons Learned

1. Add integration tests for batch queries
2. Implement automated query performance monitoring
3. Add connection pool alerts at 75% threshold

## Recommended Actions

1. Review and merge fix PR
2. Add slow query detection to CI pipeline
3. Schedule database performance workshop
```

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
      - run: npx ts-node -T src/orchestrator.ts issue-${{ github.event.issue.number }}.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Use the Programmatic API

```typescript
import { SummarizerAgent, DiagnosticRouter, IncidentTimeline } from './src/index';

const summarizer = new SummarizerAgent(platform);
const summary = await summarizer.summarize(incident);

const router = new DiagnosticRouter(platform);
router.loadRunbooks('./skills/');
const diagnostics = await router.route(incident);

const timeline = new IncidentTimeline(incident.id);
timeline.record('incident_created', { detected_at: new Date() });
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
