export interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failures: number;
  lastFailureTime: number;
  successCount: number;
}

export class CircuitBreaker {
  private states = new Map<string, CircuitBreakerState>();
  private failureThreshold: number;
  private recoveryTimeMs: number;
  private halfOpenMaxAttempts: number;

  constructor(
    failureThreshold = 3,
    recoveryTimeMs = 60_000,
    halfOpenMaxAttempts = 1
  ) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeMs = recoveryTimeMs;
    this.halfOpenMaxAttempts = halfOpenMaxAttempts;
  }

  private getState(providerId: string): CircuitBreakerState {
    if (!this.states.has(providerId)) {
      this.states.set(providerId, {
        state: "closed",
        failures: 0,
        lastFailureTime: 0,
        successCount: 0,
      });
    }
    return this.states.get(providerId)!;
  }

  canExecute(providerId: string): boolean {
    const s = this.getState(providerId);
    if (s.state === "closed") return true;
    if (s.state === "half-open") return s.successCount < this.halfOpenMaxAttempts;
    if (s.state === "open") {
      if (Date.now() - s.lastFailureTime >= this.recoveryTimeMs) {
        s.state = "half-open";
        s.successCount = 0;
        return true;
      }
      return false;
    }
    return false;
  }

  recordSuccess(providerId: string): void {
    const s = this.getState(providerId);
    if (s.state === "half-open") {
      s.successCount++;
      if (s.successCount >= this.halfOpenMaxAttempts) {
        s.state = "closed";
        s.failures = 0;
      }
    } else {
      s.failures = 0;
    }
  }

  recordFailure(providerId: string): void {
    const s = this.getState(providerId);
    s.failures++;
    s.lastFailureTime = Date.now();
    if (s.failures >= this.failureThreshold) {
      s.state = "open";
    }
  }

  getStateSnapshot(providerId: string): CircuitBreakerState {
    return { ...this.getState(providerId) };
  }
}
