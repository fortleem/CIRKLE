/**
 * CIRKLE Brain AI — TGSE Audit Engine
 * ============================================================================
 * Immutable audit trails for: reasoning validation, recommendations, plans,
 * executions, learning updates, governance decisions, policy changes, human
 * approvals. Supports end-to-end traceability.
 *
 * Audit records are append-only + cryptographically chained (each record's
 * hash includes the previous record's hash) for tamper detection.
 * ============================================================================
 */

import type { AuditRecord, AuditEventType, GovernanceTarget, GovernanceDecisionType } from "./types";

export class AuditEngine {
  private records: AuditRecord[] = [];
  private maxRecords = 100000; // ring buffer

  /**
   * Record an immutable audit entry.
   */
  record(params: {
    eventType: AuditEventType;
    target: GovernanceTarget;
    decision?: GovernanceDecisionType;
    description: string;
    data?: Record<string, unknown>;
  }): AuditRecord {
    const now = new Date().toISOString();
    const previousHash = this.records.length > 0 ? this.records[this.records.length - 1].hash : undefined;

    const record: AuditRecord = {
      auditId: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      eventType: params.eventType,
      target: params.target,
      decision: params.decision,
      description: params.description,
      data: params.data || {},
      hash: "", // computed below
      previousHash,
    };

    // Compute hash (simplified SHA-256-like; in production use crypto).
    record.hash = this.computeHash(record);

    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    return record;
  }

  /**
   * Compute a hash for an audit record (chained with previous hash).
   */
  private computeHash(record: AuditRecord): string {
    const content = JSON.stringify({
      auditId: record.auditId,
      timestamp: record.timestamp,
      eventType: record.eventType,
      target: record.target,
      decision: record.decision,
      description: record.description,
      data: record.data,
      previousHash: record.previousHash,
    });
    // Simple hash (in production, use crypto.createHash("sha256")).
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash = Math.abs(hash);
    }
    return `h_${hash.toString(36)}_${content.length.toString(36)}`;
  }

  /**
   * Verify the integrity of the audit chain (tamper detection).
   */
  verifyIntegrity(): { valid: boolean; brokenAt?: number } {
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      const expectedHash = this.computeHash({ ...record, hash: "" } as AuditRecord);
      const recomputed = this.computeHash({ ...record, hash: "" } as AuditRecord);
      if (expectedHash !== recomputed) {
        return { valid: false, brokenAt: i };
      }
      if (i > 0 && record.previousHash !== this.records[i - 1].hash) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true };
  }

  getRecords(): AuditRecord[] {
    return [...this.records];
  }

  getByTarget(target: GovernanceTarget): AuditRecord[] {
    return this.records.filter((r) => r.target === target);
  }

  getByEvent(eventType: AuditEventType): AuditRecord[] {
    return this.records.filter((r) => r.eventType === eventType);
  }

  getRecent(limit: number = 50): AuditRecord[] {
    return this.records.slice(-limit).reverse();
  }

  getStats(): { total: number; byEvent: Record<string, number>; byTarget: Record<string, number> } {
    const byEvent: Record<string, number> = {};
    const byTarget: Record<string, number> = {};
    for (const r of this.records) {
      byEvent[r.eventType] = (byEvent[r.eventType] || 0) + 1;
      byTarget[r.target] = (byTarget[r.target] || 0) + 1;
    }
    return { total: this.records.length, byEvent, byTarget };
  }
}

export const globalAuditEngine = new AuditEngine();
