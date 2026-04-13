import { describe, it, expect, beforeEach } from 'vitest';
import { parseIncidentFromIssue, extractServiceName } from '../src/incident-intake';
import { Incident } from '../src/types';

describe('Incident Intake', () => {
  describe('parseIncidentFromIssue', () => {
    it('should parse incident from GitHub issue', async () => {
      // TODO: Test implementation
    });

    it('should extract service name from incident title or labels', async () => {
      // TODO: Test implementation
    });

    it('should handle malformed incidents gracefully', async () => {
      // TODO: Test implementation
    });
  });

  describe('extractServiceName', () => {
    it('should identify service from labels', () => {
      // TODO: Test implementation
    });

    it('should return unknown for missing service', () => {
      // TODO: Test implementation
    });
  });
});
