# QUICKSTART: Incident Response Workflow

Get started with the Squad Incident Response system in 5 minutes.

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Git** (for cloning and running examples)
- **GitHub account** (to create test issues and view PR drafts)

## 1. Clone & Install

```bash
cd ~/projects
git clone <repo-url> project-squad-sdk-example-incident
cd project-squad-sdk-example-incident

npm install
npm run build
```

**Expected output:**
```
> npm install
npm WARN ... (dependency resolution warnings are OK)
added 127 packages in 2.3s

> npm run build
tsc
✓ TypeScript compiled successfully
```

## 2. Run Tests

```bash
npm run test:run
```

**Expected output:**
```
✓ test/incident-intake.test.ts (3 tests)
✓ test/incident-coordinator.test.ts (2 tests)
✓ test/summarizer-agent.test.ts (3 tests)
...
47 tests total | 0 failed | 0 skipped
```

## 3. Your First Incident Response

This example walks through a complete incident lifecycle: creation → summarization → diagnostics → PR draft → post-mortem.

### Step 3.1: Create an Incident Issue

On GitHub, create a new issue on your test repo with:

**Title:**
```
Production: API latency spike detected
```

**Body:**
```markdown
## Alert Details
- Service: api
- Severity: high
- Duration: 5 minutes
- Error Rate: 0% (latency issue only)
- Affected Endpoint: /api/orders/list

## Context
Started at 14:32 UTC. Latency went from 50ms to 500ms.
Recent deployment: commit abc1234 deployed 10 minutes before incident.

## Logs
```
RequestLatency{endpoint=/orders/list, p95=500ms, p99=1500ms}
```

**Labels:**
- `service:api`
- `severity:high`
```

**Result:** GitHub issue #123 created (note the issue number)

### Step 3.2: Initialize Incident Coordinator

Create a file `example-incident.ts`:

```typescript
import { IncidentCoordinator, parseIncidentFromIssue } from './src/index';
import { createPlatformAdapter } from '@bradygaster/squad-sdk';

const main = async () => {
  // Configure platform (GitHub)
  const platform = createPlatformAdapter('github', {
    owner: 'your-org',
    repo: 'your-repo',
    token: process.env.GITHUB_TOKEN,
  });

  // Fetch the issue
  const gitHubIssue = await platform.getIssue(123); // Your issue #

  // Parse incident from issue
  const incident = parseIncidentFromIssue(gitHubIssue);
  console.log('📋 Incident parsed:', incident);
  // Output:
  // {
  //   id: "123",
  //   title: "Production: API latency spike detected",
  //   service: "api",
  //   severity: "high",
  //   description: "Started at 14:32 UTC...",
  //   issueUrl: "https://github.com/your-org/your-repo/issues/123"
  // }

  // Create coordinator
  const coordinator = new IncidentCoordinator(incident, platform);
  console.log('🚀 Incident coordinator initialized');
};

main().catch(console.error);
```

Run it:
```bash
GITHUB_TOKEN=ghp_... npx ts-node example-incident.ts
```

**Expected output:**
```
📋 Incident parsed: {
  id: '123',
  title: 'Production: API latency spike detected',
  service: 'api',
  severity: 'high',
  ...
}
🚀 Incident coordinator initialized
```

### Step 3.3: Generate Incident Summary

```typescript
// ... continuing from Step 3.2 ...

const coordinator = new IncidentCoordinator(incident, platform);

// Generate summary
const summary = await coordinator.summarize();
console.log('📝 Incident summary:');
console.log(JSON.stringify(summary, null, 2));
```

**Expected output:**
```
📝 Incident summary:
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

### Step 3.4: Run Diagnostics (Load Runbook)

Create an API runbook at `skills/api-runbook.md`:

```markdown
# API Service Runbook

## 1. Check Error Logs
- Look for panics, exceptions, timeouts in last 5 minutes
- Filter by endpoint: /api/orders/*

## 2. Query Metrics
- Request latency (p50, p95, p99)
- Error rate
- Requests per second (RPS)
- Database connection pool utilization

## 3. Inspect Deployments
- Check recent deployments (last 30 minutes)
- Identify code changes to hot paths
- Review database migration logs

## 4. Check Dependencies
- Upstream services: payment gateway, inventory service
- Database health and query performance
- Cache hit rates (Redis)

## Typical Causes & Fixes
| Cause | Indicator | Fix |
|-------|-----------|-----|
| N+1 queries | DB response time +300% | Add batch query or eager load |
| Inefficient query | Query time increased | Add index or optimize WHERE clause |
| Depleted connection pool | connections_in_use = max | Scale database connections |
| Slow downstream | p99 >> p95 | Check payment gateway SLA |
```

```typescript
import { DiagnosticRouter } from './src/index';

const router = new DiagnosticRouter(platform);
router.loadRunbooks('./skills/');

const diagnostics = await router.route(incident);
console.log('🔍 Diagnostics:', JSON.stringify(diagnostics, null, 2));
```

**Expected output:**
```
🔍 Diagnostics: {
  "service": "api",
  "status": "success",
  "findings": [
    "N+1 query detected in src/handlers/orders.ts lines 45-62",
    "SELECT * loop should be replaced with batch query",
    "Database connection pool at 85% utilization"
  ],
  "recommendations": [
    "Replace loop with single batch query using IN clause",
    "Add query cache to prevent repeated database hits",
    "Consider pagination for large result sets"
  ]
}
```

### Step 3.5: Draft Fix PR

```typescript
import { FixPRDrafter } from './src/index';

const drafter = new FixPRDrafter(platform);
const draftPR = await drafter.draft(incident, summary, diagnostics);

console.log('📋 Fix PR draft:');
console.log('Title:', draftPR.title);
console.log('Branch:', draftPR.branch_name);
console.log('Changes:', draftPR.files.length, 'files');
console.log('Requires approval:', draftPR.requires_approval);
```

**Expected output:**
```
📋 Fix PR draft:
Title: fix(api): optimize orders endpoint query to fix latency
Branch: fix/incident-123-api-latency
Changes: 1 files
Requires approval: true

File: src/handlers/orders.ts
Before:
  const orders = [];
  for (const id of orderIds) {
    orders.push(await db.query('SELECT * FROM orders WHERE id = ?', [id]));
  }

After:
  const orders = await db.query(
    'SELECT * FROM orders WHERE id IN (?) LIMIT 1000',
    [orderIds]
  );
```

### Step 3.6: Record Timeline & Decisions

```typescript
import { IncidentTimeline, DecisionsLogger } from './src/index';

const timeline = new IncidentTimeline(incident.id);
timeline.record('incident_created', { detected_at: new Date() });
timeline.record('summary_generated', { duration_ms: 2500 });
timeline.record('diagnostics_complete', { service: 'api', findings: 3 });
timeline.record('pr_drafted', { branch: draftPR.branch_name });

const logger = new DecisionsLogger();
logger.log('pr_draft_created', {
  context: 'fix_latency_spike',
  approver_required: true,
  suggested_action: 'Review fix PR and approve for deployment',
});

console.log('📅 Timeline:', timeline.entries);
```

**Expected output:**
```
📅 Timeline: [
  { timestamp: 2024-01-15T14:35:00Z, action: 'incident_created', details: {...} },
  { timestamp: 2024-01-15T14:35:02Z, action: 'summary_generated', details: {...} },
  { timestamp: 2024-01-15T14:35:03Z, action: 'diagnostics_complete', details: {...} },
  { timestamp: 2024-01-15T14:35:05Z, action: 'pr_drafted', details: {...} }
]
```

### Step 3.7: Generate Post-Mortem

```typescript
import { PostMortemGenerator, PostMortemPublisher } from './src/index';

// Generate post-mortem
const pmgen = new PostMortemGenerator();
const postmortem = pmgen.generate(incident, timeline, [], 3);
console.log('📄 Post-mortem summary:');
console.log('Duration:', postmortem.duration_minutes, 'minutes');
console.log('Actions taken:', timeline.entries.length);
console.log('Lessons learned:', postmortem.lessons_learned);

// Publish to GitHub issue
const publisher = new PostMortemPublisher(platform);
await publisher.publish(postmortem, incident.id);
console.log('✅ Post-mortem published to issue #' + incident.id);
```

**Expected output:**
```
📄 Post-mortem summary:
Duration: 3 minutes
Actions taken: 4
Lessons learned: [
  "Add integration tests for batch queries",
  "Implement automated query performance monitoring",
  "Add connection pool alerts at 75% threshold"
]
✅ Post-mortem published to issue #123
```

## Common Next Steps

### 1. Automate Incident Intake

Create a GitHub Action that triggers on new issues with `incident:` prefix:

```yaml
# .github/workflows/incident-response.yml
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
      - run: npm run build
      - run: npx ts-node incident-response.ts ${{ github.event.issue.number }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Add Custom Runbooks

Create service-specific runbooks:

```bash
skills/
├── api-runbook.md
├── database-runbook.md
├── cache-runbook.md
└── payment-gateway-runbook.md
```

Each runbook is loaded as a callable skill by `RunbookRegistry`.

### 3. Integrate with Slack

```typescript
const publisher = new PostMortemPublisher(platform);
await publisher.publishToSlack(postmortem, process.env.SLACK_WEBHOOK_URL);
```

### 4. Run in Watch Mode for Development

```bash
npm run test:watch
# Or with TypeScript compilation:
tsc --watch
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Check Node.js version: `node --version` should be 18+ |
| `npm run build` fails | Check for TypeScript errors: `npx tsc --noEmit` |
| Tests fail | Run `npm run test:watch` and check test output for assertions |
| `GITHUB_TOKEN` not found | Export token: `export GITHUB_TOKEN=ghp_...` |
| Platform adapter fails | Check repo owner/name in config matches actual GitHub repo |

## Learn More

- **[README.md](./README.md)** — Project overview and architecture
- **[PLAN.md](./PLAN.md)** — Detailed TDD implementation plan (7 phases)
- **[src/types.ts](./src/types.ts)** — All shared types and interfaces
- **[Squad SDK Docs](https://github.com/bradygaster/squad)** — Core SDK reference
