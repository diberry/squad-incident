# TDD Implementation Plan: Squad SDK Incident Response

## Project Overview
Build an incident assistance tool on Squad SDK that auto-summarizes production alerts and drafts fix PRs from runbooks.

## SDK Modules Used (Verified)

| Module | Actually Provides | Gap |
|--------|-------------------|-----|
| `platform.createPlatformAdapter()` | Create issues, PRs, labels on GitHub/ADO | ✅ Solid |
| `skills.SkillRegistry` | Load service-specific runbooks as skills | ✅ Solid |
| `builders.defineRouting()` | Route by pattern/keyword to specialist agents | ✅ Solid |
| `state.DecisionsCollection` | Record incident decisions for post-mortem | ✅ Solid |
| `runtime.EventBus` | In-process event stream | ⚠️ In-process only, not cross-service |

## Known Gaps to Build
- Webhook ingestion from PagerDuty/Datadog (GitHub issue intake only for MVP)
- Slack/Teams notification sending (use existing comms adapters or file-based)
- Service health monitoring and blast radius analysis (P1)
- Infrastructure-level access or remediation (P1)

---

## Phase 1: Foundation & Incident Intake

### Feature 1.1: Incident Intake Parser
**Test First:**
- `test/incident-intake.test.ts` → `should parse incident from GitHub issue`
  - Given issue title="Production: Database CPU 95%", body contains service name and severity
  - Assert: Returns Incident object with { id, title, service, severity, description }
- `should extract service name from incident title or labels`
  - Given labels=["service:api", "severity:critical"]
  - Assert: Identifies service="api"
- `should handle malformed incidents gracefully`
  - Given issue with no service tags
  - Assert: Returns incident with service="unknown" and logs warning

**Implementation:**
- Create `src/incident-intake.ts` with `parseIncidentFromIssue(issue): Incident`
- Export type `Incident` with fields: id, title, service, severity, description, createdAt, issueUrl
- Support regex extraction from title and label parsing

---

### Feature 1.2: Incident Coordinator Agent
**Test First:**
- `test/incident-coordinator.test.ts` → `should initialize incident coordinator`
  - Given incident object
  - Assert: Coordinator created with state tracking (summary, pr drafts, timeline)
- `should bootstrap incident timeline on creation`
  - Given incident
  - Assert: DecisionsCollection initialized, first action logged
- `should route incident to summarizer and fix agents`
  - Given incident
  - Assert: Multiple agents spawned via builder routing

**Implementation:**
- Create `src/incident-coordinator.ts` with `IncidentCoordinator` class
- Integrates with `DecisionsCollection` for timeline
- Uses `defineRouting()` to dispatch to specialized agents
- Manages conversation state and agent outputs

---

## Phase 2: Summarization Engine

### Feature 2.1: Incident Summarizer Agent
**Test First:**
- `test/summarizer-agent.test.ts` → `should generate incident summary`
  - Given incident + code context
  - Assert: Summary contains { what, where, severity, likely_cause, affected_services }
- `should cite code locations in summary`
  - Given incident referencing file "src/api/handler.ts"
  - Assert: Summary includes line ranges or file references
- `should detect severity from incident metadata`
  - Given incident with "CRITICAL" label
  - Assert: Summary severity level matches

**Implementation:**
- Create `src/summarizer-agent.ts` with `SummarizerAgent` class
- Uses platform adapter to fetch issue details + linked code
- Structures summary as JSON object
- Returns summary ready for PR draft or escalation

---

### Feature 2.2: Code Context Fetcher
**Test First:**
- `test/code-context.test.ts` → `should fetch relevant code files`
  - Given incident service="api" and error message referencing "handler.ts"
  - Assert: Returns file contents and snippets
- `should cache fetched files`
  - Given repeated requests for same file
  - Assert: Returns cached result (no API call)
- `should respect repo structure`
  - Given platform adapter configured for GitHub
  - Assert: Fetches from correct repo

**Implementation:**
- Create `src/code-context.ts` with `CodeContextFetcher` class
- Integrates with platform adapter
- Caching layer using Map or persisted state
- Returns { file, language, content, startLine, endLine }

---

## Phase 3: Runbook Loading & Diagnostic Routing

### Feature 3.1: Runbook Skill Registry
**Test First:**
- `test/runbook-registry.test.ts` → `should load runbooks as skills`
  - Given runbook files in skills directory
  - Assert: `SkillRegistry.load()` returns runbook skills
- `should list available runbooks by service`
  - Given multiple services
  - Assert: Returns skills indexed by service name
- `should execute diagnostic steps from runbook`
  - Given runbook with steps like "check error logs", "inspect metrics"
  - Assert: Skill returns structured diagnostic result

**Implementation:**
- Create `src/runbook-registry.ts` with `RunbookRegistry` class
- Extends Squad SDK `SkillRegistry`
- Loads `.md` or `.json` runbook files from `skills/` directory
- Each runbook exposed as a callable skill
- Returns skill results formatted as diagnostic report

---

### Feature 3.2: Diagnostic Agent Router
**Test First:**
- `test/diagnostic-router.test.ts` → `should route incident to correct diagnostic skill`
  - Given incident with service="database"
  - Assert: Routes to database.diagnose skill
- `should handle multi-service incidents`
  - Given incident affecting services A and B
  - Assert: Spawns parallel diagnostic agents for both
- `should aggregate diagnostic results`
  - Given multiple diagnostics complete
  - Assert: Merges results into unified report

**Implementation:**
- Create `src/diagnostic-router.ts` with `DiagnosticRouter` class
- Uses `defineRouting()` to match incident service to runbooks
- Spawns parallel agent sessions per service
- Collects and aggregates results

---

## Phase 4: Fix PR Drafting

### Feature 4.1: Fix PR Drafter Agent
**Test First:**
- `test/fix-pr-drafter.test.ts` → `should draft PR from runbook`
  - Given incident summary + runbook diagnostic
  - Assert: PR object with { title, body, files, branch_name }
- `should include change description in PR body`
  - Given summary + code analysis
  - Assert: PR body links incident → diagnosis → proposed fix
- `should include test changes in PR draft`
  - Given runbook suggests regression test
  - Assert: PR includes test file changes
- `should require human approval before creating PR`
  - Given draft PR
  - Assert: Returns draft only, no actual PR created on GitHub

**Implementation:**
- Create `src/fix-pr-drafter.ts` with `FixPRDrafter` class
- Takes summary and diagnostic results
- Generates code changes (file diffs or full files)
- Structures PR metadata without creating it
- Returns `DraftPR` object with approval flag

---

### Feature 4.2: PR Change Generator
**Test First:**
- `test/pr-changes.test.ts` → `should generate code changes from fix description`
  - Given fix description and existing file content
  - Assert: Returns file changes with before/after
- `should include comments explaining change`
  - Given change + reasoning
  - Assert: Adds inline comments
- `should handle multi-file changes`
  - Given fix affecting 3 files
  - Assert: Returns all file changes

**Implementation:**
- Create `src/pr-changes.ts` with `PRChangeGenerator` class
- Takes fix proposal and code context
- Generates diffs or full file contents
- Includes explanatory comments
- Validates syntax if possible

---

## Phase 5: Incident Timeline & Decisions

### Feature 5.1: Incident Timeline Recorder
**Test First:**
- `test/incident-timeline.test.ts` → `should record action to timeline`
  - Given action (e.g., "summarizer completed", "fix drafted")
  - Assert: DecisionsCollection entry created with timestamp
- `should maintain append-only log`
  - Given multiple actions
  - Assert: Timeline is ordered by timestamp, immutable
- `should persist timeline to .squad/incidents/`
  - Given completed incident
  - Assert: Timeline file exists and readable

**Implementation:**
- Create `src/incident-timeline.ts` with `IncidentTimeline` class
- Wraps `DecisionsCollection` from SDK
- Defines action types: "incident_created", "summary_generated", "fix_drafted", "pr_approved", "resolution"
- Persists to `.squad/incidents/{incident-id}.json`

---

### Feature 5.2: Decisions Logger
**Test First:**
- `test/decisions-logger.test.ts` → `should log key decisions`
  - Given decision (e.g., "approved fix PR", "escalated to oncall")
  - Assert: DecisionsCollection records decision with timestamp + metadata
- `should link decisions to timeline`
  - Given timeline + decision
  - Assert: Decision references incident action
- `should support decision context`
  - Given decision with context (e.g., approver name, reason)
  - Assert: Context preserved in log

**Implementation:**
- Create `src/decisions-logger.ts` with `DecisionsLogger` class
- Uses SDK `DecisionsCollection.record()`
- Defines decision schema
- Links decisions to timeline events

---

## Phase 6: Post-Mortem Generation

### Feature 6.1: Post-Mortem Generator
**Test First:**
- `test/post-mortem-generator.test.ts` → `should generate post-mortem from timeline`
  - Given incident timeline + decisions
  - Assert: Post-mortem contains { incident_summary, timeline, decisions, resolution, duration }
- `should calculate incident duration`
  - Given start and end times from timeline
  - Assert: Duration calculated and formatted
- `should format post-mortem as markdown`
  - Given completed incident
  - Assert: Post-mortem is valid markdown, readable

**Implementation:**
- Create `src/post-mortem-generator.ts` with `PostMortemGenerator` class
- Reads timeline and decisions from `.squad/incidents/`
- Generates markdown report
- Includes metrics: duration, actions taken, approvals, outcomes
- Stores post-mortem in `.squad/incidents/{incident-id}-postmortem.md`

---

### Feature 6.2: Post-Mortem Publisher
**Test First:**
- `test/post-mortem-publisher.test.ts` → `should publish post-mortem to GitHub`
  - Given post-mortem markdown + platform adapter
  - Assert: Posts comment on original incident issue
- `should support optional Slack posting`
  - Given post-mortem + Slack webhook
  - Assert: Posts formatted summary to channel
- `should include lessons learned section`
  - Given timeline
  - Assert: Post-mortem suggests preventive measures

**Implementation:**
- Create `src/post-mortem-publisher.ts` with `PostMortemPublisher` class
- Uses platform adapter to post comment on issue
- Optional Slack integration (webhook URL from env)
- Formats for readability and archival

---

## Phase 7: End-to-End Integration

### Feature 7.1: Incident Response Orchestrator
**Test First:**
- `test/orchestrator.test.ts` → `should run complete incident response workflow`
  - Given incident issue + runbooks
  - Assert: Generates summary → drafts PR → records timeline → completes
- `should handle errors gracefully`
  - Given failed diagnostic step
  - Assert: Logs error, continues with available data
- `should support workflow checkpoints`
  - Given partial completion (e.g., summary but no PR)
  - Assert: Can resume from checkpoint

**Implementation:**
- Create `src/orchestrator.ts` with `IncidentResponseOrchestrator` class
- Chains all prior components
- Error handling and logging
- Checkpoint/resume capability

---

## Test Files Structure

```
test/
├── incident-intake.test.ts          # 1.1 test
├── incident-coordinator.test.ts     # 1.2 test
├── summarizer-agent.test.ts         # 2.1 test
├── code-context.test.ts             # 2.2 test
├── runbook-registry.test.ts         # 3.1 test
├── diagnostic-router.test.ts        # 3.2 test
├── fix-pr-drafter.test.ts           # 4.1 test
├── pr-changes.test.ts               # 4.2 test
├── incident-timeline.test.ts        # 5.1 test
├── decisions-logger.test.ts         # 5.2 test
├── post-mortem-generator.test.ts    # 6.1 test
├── post-mortem-publisher.test.ts    # 6.2 test
├── orchestrator.test.ts             # 7.1 test
└── fixtures/
    ├── sample-incident.json
    ├── sample-runbook.md
    └── sample-code.ts
```

## Source Files Structure

```
src/
├── index.ts                         # Main exports
├── types.ts                         # Shared types (Incident, DraftPR, Timeline, etc)
├── incident-intake.ts              # 1.1 implementation
├── incident-coordinator.ts         # 1.2 implementation
├── summarizer-agent.ts             # 2.1 implementation
├── code-context.ts                 # 2.2 implementation
├── runbook-registry.ts             # 3.1 implementation
├── diagnostic-router.ts            # 3.2 implementation
├── fix-pr-drafter.ts               # 4.1 implementation
├── pr-changes.ts                   # 4.2 implementation
├── incident-timeline.ts            # 5.1 implementation
├── decisions-logger.ts             # 5.2 implementation
├── post-mortem-generator.ts        # 6.1 implementation
├── post-mortem-publisher.ts        # 6.2 implementation
├── orchestrator.ts                 # 7.1 implementation
└── skills/
    ├── api-runbook.md              # Example runbook for API service
    ├── database-runbook.md         # Example runbook for database service
    └── config.ts                   # Runbook loader config
```

## Implementation Order (Dependencies)

1. **Phase 1** (Foundation): incident-intake, incident-coordinator, types
2. **Phase 2** (Summarization): summarizer-agent, code-context
3. **Phase 3** (Diagnostics): runbook-registry, diagnostic-router
4. **Phase 4** (PR Drafting): fix-pr-drafter, pr-changes
5. **Phase 5** (Timeline): incident-timeline, decisions-logger
6. **Phase 6** (Post-Mortem): post-mortem-generator, post-mortem-publisher
7. **Phase 7** (Integration): orchestrator

## Success Criteria

- ✅ All test skeletons created with meaningful describe/it stubs
- ✅ All implementation files created with placeholder exports
- ✅ Types file defines all shared interfaces
- ✅ TDD plan documents test-first approach for each feature
- ✅ Git repository initialized and committed
- ✅ No npm install run (dependencies not resolved yet)
- ✅ Project ready for iterative TDD development

## Next Steps

1. Run `npm install` to resolve dependencies
2. Start with Phase 1: Implement incident-intake tests and code
3. Verify each test passes before moving to Phase 2
4. Build runbooks for example services
5. End-to-end integration testing in Phase 7
