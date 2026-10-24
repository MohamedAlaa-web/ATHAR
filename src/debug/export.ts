import type { ScenarioMatrix } from '../positioning/core/scenario';

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function scenarioToCsv(matrix: ScenarioMatrix): string {
  const header = [
    'run_id',
    'path',
    'crowd',
    'config',
    'steps',
    'duration_sec',
    'mean_error_m',
    'median_error_m',
    'p95_error_m',
    'hall_accuracy_pct',
    'nearest_artifact_accuracy_pct',
    'update_rate_hz',
    'beacon_readings_used_avg',
    'sensor_activations_per_min',
    'cpu_ops_per_min',
    'final_truth_x',
    'final_truth_y',
    'final_truth_floor',
    'final_estimate_x',
    'final_estimate_y',
    'final_estimate_floor',
    'seed',
    'qr_reset_count',
    'qr_artifact_reset_count',
    'qr_reset_times_sec',
    'qr_reset_events'
  ].join(',');
  const rows = matrix.runs.map((run) =>
    [
      run.id,
      run.pathId,
      run.crowd,
      run.config,
      run.steps,
      run.durationSec,
      run.meanErrorM,
      run.medianErrorM,
      run.p95ErrorM,
      run.hallAccuracyPct,
      run.nearestArtifactAccuracyPct,
      run.updateRateHz,
      run.beaconReadingsUsedAvg,
      run.sensorActivationsPerMin,
      run.cpuOpsPerMin,
      run.finalTruth.x,
      run.finalTruth.y,
      run.finalTruth.floor,
      run.finalEstimate.x,
      run.finalEstimate.y,
      run.finalEstimate.floor,
      run.seed,
      run.qrResetCount,
      run.qrArtifactResetCount,
      run.qrResets.map((reset) => reset.atSec).join(';'),
      run.qrResets
        .map((reset) => `${reset.atSec}:${reset.kind}${reset.artifactId ? `:${reset.artifactId}` : ''}`)
        .join(';')
    ]
      .map(escapeCsv)
      .join(',')
  );
  return `${header}\n${rows.join('\n')}\n`;
}

export function scenarioToJson(matrix: ScenarioMatrix): string {
  return JSON.stringify(matrix, null, 2);
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function timestampSlug(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
