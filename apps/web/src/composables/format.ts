/** Formata segundos como m:ss (ex.: 189 -> "3:09"). */
export function formatDuration(totalSeconds: number | undefined | null): string {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return "--:--";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
