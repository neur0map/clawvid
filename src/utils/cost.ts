import chalk from 'chalk';

export function formatCostSummary(
  total: number,
  breakdown: Record<string, number>,
): string {
  const lines = [
    chalk.bold('Cost Summary'),
    chalk.gray('─'.repeat(40)),
  ];

  for (const [endpoint, cost] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
    const name = endpoint.split('/').pop() ?? endpoint;
    lines.push(`  ${name.padEnd(25)} $${cost.toFixed(4)}`);
  }

  lines.push(chalk.gray('─'.repeat(40)));
  lines.push(chalk.bold(`  Total:${' '.repeat(18)}$${total.toFixed(4)}`));

  return lines.join('\n');
}
