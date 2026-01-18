import crypto from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StateEntry {
  createdAt: number;
}

class StateManager {
  private states: Map<string, StateEntry> = new Map();

  generateState(): string {
    this.cleanup();
    const state = crypto.randomBytes(32).toString("hex");
    this.states.set(state, { createdAt: Date.now() });
    return state;
  }

  validateState(state: string): boolean {
    this.cleanup();
    const entry = this.states.get(state);
    if (!entry) {
      return false;
    }
    this.states.delete(state);
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [state, entry] of this.states.entries()) {
      if (now - entry.createdAt > STATE_TTL_MS) {
        this.states.delete(state);
      }
    }
  }
}

export const stateManager = new StateManager();
