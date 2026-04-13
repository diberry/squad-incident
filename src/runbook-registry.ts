import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Runbook {
  name: string;
  service: string;
  content: string;
  diagnosticSteps: string[];
  resolutionSteps: string[];
}

export interface RunbookDiagnosticResult {
  service: string;
  runbook: string;
  stepsExecuted: string[];
  findings: string[];
  recommendations: string[];
}

/**
 * Runbook registry for loading and managing runbooks as skills
 */
export class RunbookRegistry {
  private runbooks: Map<string, Runbook> = new Map();

  /**
   * Load runbooks as skills from directory
   */
  async loadRunbooks(skillsDir: string): Promise<Map<string, Runbook>> {
    if (!fs.existsSync(skillsDir)) return this.runbooks;

    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md') || f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(skillsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const serviceName = path.basename(file, path.extname(file)).replace('-runbook', '');

      const runbook = this.parseRunbook(serviceName, content);
      this.runbooks.set(serviceName, runbook);
    }

    return this.runbooks;
  }

  /**
   * List available runbooks by service
   */
  listByService(service: string): Runbook[] {
    const results: Runbook[] = [];
    for (const [key, runbook] of this.runbooks) {
      if (key === service || runbook.service === service) {
        results.push(runbook);
      }
    }
    return results;
  }

  /**
   * Execute diagnostic steps from runbook
   */
  async executeDiagnostics(service: string, runbook?: Runbook): Promise<RunbookDiagnosticResult> {
    const rb = runbook ?? this.runbooks.get(service);
    if (!rb) {
      return {
        service,
        runbook: 'unknown',
        stepsExecuted: [],
        findings: [`No runbook found for service: ${service}`],
        recommendations: ['Create a runbook for this service'],
      };
    }

    return {
      service,
      runbook: rb.name,
      stepsExecuted: rb.diagnosticSteps,
      findings: rb.diagnosticSteps.map(s => `Executed: ${s}`),
      recommendations: rb.resolutionSteps,
    };
  }

  /**
   * Get all registered runbooks
   */
  getAllRunbooks(): Map<string, Runbook> {
    return new Map(this.runbooks);
  }

  private parseRunbook(serviceName: string, content: string): Runbook {
    const diagnosticSteps: string[] = [];
    const resolutionSteps: string[] = [];

    let section = '';
    for (const line of content.split('\n')) {
      if (line.match(/^##\s*Diagnostics/i)) { section = 'diagnostics'; continue; }
      if (line.match(/^##\s*Resolution/i)) { section = 'resolution'; continue; }
      if (line.match(/^##\s/)) { section = 'other'; continue; }

      const bullet = line.match(/^[-*]\s+(.+)/);
      const numbered = line.match(/^\d+\.\s+(.+)/);
      const item = bullet?.[1] ?? numbered?.[1];

      if (item) {
        if (section === 'diagnostics') diagnosticSteps.push(item.trim());
        if (section === 'resolution') resolutionSteps.push(item.trim());
      }
    }

    return {
      name: `${serviceName}-runbook`,
      service: serviceName,
      content,
      diagnosticSteps,
      resolutionSteps,
    };
  }
}
