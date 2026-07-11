/**
 * CIRKLE Brain AI — AI Provider Circuit Breaker (Upgrade 8)
 * ============================================================================
 * Circuit breaker pattern for AI providers. Automatically fails over when
 * a provider goes down, and routes to the fastest available provider.
 * ============================================================================
 */

export type CircuitState = "closed" | "open" | "half-open";

interface ProviderCircuit {
  state: CircuitState;
  failureCount: number;
  failureThreshold: number;
  resetTimeoutMs: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  averageLatencyMs: number;
  requestCount: number;
}

export class CircuitBreaker {
  private circuits = new Map<string, ProviderCircuit>();

  /**
   * Check if a provider is available (circuit closed or half-open).
   */
  isAvailable(provider: string): boolean {
    const circuit = this.getOrCreate(provider);
    if (circuit.state === "closed") return true;
    if (circuit.state === "open") {
      // Check if reset timeout has passed.
      if (Date.now() - circuit.lastFailureTime > circuit.resetTimeoutMs) {
        circuit.state = "half-open";
        return true;
      }
      return false;
    }
    return true; // half-open
  }

  /**
   * Record a successful call.
   */
  recordSuccess(provider: string, latencyMs: number): void {
    const circuit = this.getOrCreate(provider);
    circuit.failureCount = 0;
    circuit.state = "closed";
    circuit.lastSuccessTime = Date.now();
    circuit.requestCount++;
    // Update rolling average latency.
    circuit.averageLatencyMs = circuit.averageLatencyMs === 0
      ? latencyMs
      : (circuit.averageLatencyMs * 0.9 + latencyMs * 0.1);
  }

  /**
   * Record a failed call.
   */
  recordFailure(provider: string): void {
    const circuit = this.getOrCreate(provider);
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    if (circuit.failureCount >= circuit.failureThreshold) {
      circuit.state = "open";
    }
  }

  /**
   * Get the best available provider (lowest latency, circuit closed).
   */
  getBestProvider(providers: string[]): string | null {
    const available = providers
      .filter((p) => this.isAvailable(p))
      .sort((a, b) => {
        const ca = this.getOrCreate(a);
        const cb = this.getOrCreate(b);
        return ca.averageLatencyMs - cb.averageLatencyMs;
      });
    return available[0] || null;
  }

  /**
   * Get circuit status for all providers.
   */
  getStatus(): Record<string, { state: CircuitState; failureCount: number; averageLatencyMs: number; requestCount: number }> {
    const status: Record<string, { state: CircuitState; failureCount: number; averageLatencyMs: number; requestCount: number }> = {};
    for (const [provider, circuit] of this.circuits.entries()) {
      status[provider] = {
        state: circuit.state,
        failureCount: circuit.failureCount,
        averageLatencyMs: Math.round(circuit.averageLatencyMs),
        requestCount: circuit.requestCount,
      };
    }
    return status;
  }

  private getOrCreate(provider: string): ProviderCircuit {
    if (!this.circuits.has(provider)) {
      this.circuits.set(provider, {
        state: "closed",
        failureCount: 0,
        failureThreshold: 3,
        resetTimeoutMs: 30000, // 30 seconds before trying again
        lastFailureTime: 0,
        lastSuccessTime: 0,
        averageLatencyMs: 0,
        requestCount: 0,
      });
    }
    return this.circuits.get(provider)!;
  }
}

export const globalCircuitBreaker = new CircuitBreaker();
