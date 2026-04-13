import { Incident, DiagnosticResult } from './types';
import { RunbookRegistry } from './runbook-registry';

/**
 * Routes incidents to appropriate diagnostic agents
 */
export class DiagnosticRouter {
  private registry: RunbookRegistry;

  constructor(registry?: RunbookRegistry) {
    this.registry = registry ?? new RunbookRegistry();
  }

  /**
   * Route incident to correct diagnostic skill
   */
  async routeToDiagnostics(incident: Incident): Promise<DiagnosticResult[]> {
    const result = await this.registry.executeDiagnostics(incident.service);
    return [{
      service: incident.service,
      status: result.findings.length > 0 ? 'success' : 'partial',
      findings: result.findings,
      recommendations: result.recommendations,
    }];
  }

  /**
   * Handle multi-service incidents
   */
  async routeMultiService(services: string[]): Promise<Map<string, DiagnosticResult>> {
    const results = new Map<string, DiagnosticResult>();
    const diagnosticPromises = services.map(async (service) => {
      const result = await this.registry.executeDiagnostics(service);
      const diagnosticResult: DiagnosticResult = {
        service,
        status: result.findings.length > 0 ? 'success' : 'partial',
        findings: result.findings,
        recommendations: result.recommendations,
      };
      return { service, diagnosticResult };
    });

    const resolved = await Promise.all(diagnosticPromises);
    for (const { service, diagnosticResult } of resolved) {
      results.set(service, diagnosticResult);
    }
    return results;
  }

  /**
   * Aggregate diagnostic results from multiple services
   */
  aggregateResults(results: DiagnosticResult[]): DiagnosticResult {
    const allFindings: string[] = [];
    const allRecommendations: string[] = [];
    const services: string[] = [];
    let worstStatus: DiagnosticResult['status'] = 'success';

    for (const result of results) {
      services.push(result.service);
      allFindings.push(...result.findings);
      allRecommendations.push(...result.recommendations);
      if (result.status === 'failed') worstStatus = 'failed';
      else if (result.status === 'partial' && worstStatus !== 'failed') worstStatus = 'partial';
    }

    return {
      service: services.join(', '),
      status: worstStatus,
      findings: allFindings,
      recommendations: allRecommendations,
      metadata: { aggregated_from: services },
    };
  }
}
