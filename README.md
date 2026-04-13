# Squad SDK Incident Response Example

An incident assistance tool built on Squad SDK that auto-summarizes production alerts and drafts fix PRs from runbooks.

## Features (P0 MVP)

- **Issue-based intake**: Create a GitHub issue describing the incident; Squad picks it up
- **Incident summarizer**: Agent reads issue + relevant code/logs, produces structured summary
- **Runbook skill loading**: Load service-specific runbook skills with diagnostic steps
- **Fix PR drafting**: Agent drafts a fix PR based on runbook + code analysis (human must approve)
- **Incident timeline**: Append-only log of actions taken, decisions made
- **Post-mortem generator**: Auto-generate post-incident review from timeline + decisions

## Project Structure

```
src/                              # Implementation
├── types.ts                       # Shared TypeScript types
├── incident-intake.ts            # Parse incidents from issues
├── incident-coordinator.ts       # Orchestrate incident response
├── summarizer-agent.ts           # Generate incident summaries
├── code-context.ts               # Fetch relevant code
├── runbook-registry.ts           # Load and manage runbooks
├── diagnostic-router.ts          # Route to diagnostics
├── fix-pr-drafter.ts             # Draft PRs from diagnostics
├── pr-changes.ts                 # Generate code changes
├── incident-timeline.ts          # Record incident timeline
├── decisions-logger.ts           # Log decisions
├── post-mortem-generator.ts      # Generate post-mortems
├── post-mortem-publisher.ts      # Publish post-mortems
├── orchestrator.ts               # End-to-end orchestration
└── index.ts                       # Main exports

test/                             # Test files (TDD-driven)
├── *.test.ts                     # Test stubs with describe/it blocks
└── fixtures/                     # Sample data for tests

PLAN.md                           # Detailed TDD implementation plan
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Review the TDD plan:
   ```bash
   cat PLAN.md
   ```

3. Run tests (currently all stubs):
   ```bash
   npm run test:watch
   ```

4. Build TypeScript:
   ```bash
   npm run build
   ```

## Development Flow

This project follows **Test-Driven Development (TDD)**:

1. **Read PLAN.md** to understand the feature
2. **Write the test** in `test/{feature}.test.ts`
3. **Implement the code** in `src/{feature}.ts`
4. **Run tests** to verify
5. **Repeat** for next feature

Features are organized into 7 phases with clear dependencies.

## SDK Modules Used

| Module | Provides | Status |
|--------|----------|--------|
| `platform.createPlatformAdapter()` | Create issues, PRs, labels on GitHub/ADO | ✅ Solid |
| `skills.SkillRegistry` | Load service-specific runbooks as skills | ✅ Solid |
| `builders.defineRouting()` | Route by pattern/keyword to specialist agents | ✅ Solid |
| `state.DecisionsCollection` | Record incident decisions for post-mortem | ✅ Solid |
| `runtime.EventBus` | In-process event stream | ⚠️ In-process only |

## Dependencies

- `@bradygaster/squad-sdk` - Core SDK
- `@bradygaster/squad-cli` - CLI utilities
- `typescript` - Type checking
- `vitest` - Test runner

## License

MIT
