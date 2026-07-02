/**
 * Kĺzavý priemer: výsledok je zarovnaný na koniec okna, takže má
 * `values.length - window + 1` bodov. Labels k nemu treba orezať
 * o `window - 1` zo začiatku.
 */
export function rollingAvg(values: number[], window: number): number[] {
  if (values.length < window || window < 1) return []
  const out: number[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= window) sum -= values[i - window]
    if (i >= window - 1) out.push(sum / window)
  }
  return out
}

/** Zvolí okno: preferované, ale max polovica dát — nech vždy je čo kresliť. */
export function pickWindow(length: number, preferred: number): number {
  return Math.max(1, Math.min(preferred, Math.floor(length / 2)))
}
