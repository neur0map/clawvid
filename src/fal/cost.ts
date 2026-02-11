import { createLogger } from '../utils/logger.js';

const log = createLogger('fal-cost');

export interface CostEntry {
  endpoint: string;
  timestamp: number;
  estimatedCost: number;
}

export class CostTracker {
  private entries: CostEntry[] = [];

  record(endpoint: string, estimatedCost: number): void {
    this.entries.push({
      endpoint,
      timestamp: Date.now(),
      estimatedCost,
    });
  }

  getTotal(): number {
    return this.entries.reduce((sum, e) => sum + e.estimatedCost, 0);
  }

  getBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const entry of this.entries) {
      breakdown[entry.endpoint] = (breakdown[entry.endpoint] ?? 0) + entry.estimatedCost;
    }
    return breakdown;
  }

  getSummary(): { total: number; breakdown: Record<string, number>; count: number } {
    return {
      total: this.getTotal(),
      breakdown: this.getBreakdown(),
      count: this.entries.length,
    };
  }
}
