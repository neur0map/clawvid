import ora, { type Ora } from 'ora';
import cliProgress from 'cli-progress';

export function createSpinner(text: string): Ora {
  return ora({ text, spinner: 'dots' });
}

export function createProgressBar(total: number, label: string): cliProgress.SingleBar {
  const bar = new cliProgress.SingleBar(
    {
      format: `${label} |{bar}| {percentage}% | {value}/{total}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );
  bar.start(total, 0);
  return bar;
}
