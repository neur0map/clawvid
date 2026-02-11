import { createHash } from 'node:crypto';

export function hashWorkflowStep(step: Record<string, unknown>): string {
  const json = JSON.stringify(step, Object.keys(step).sort());
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}
