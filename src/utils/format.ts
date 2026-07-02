export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const ms = `${m}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : ms
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

export function timeAgo(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)} d ago`
  const months = Math.floor(diff / (30 * 86400))
  return months < 12 ? `${months} mo ago` : `${Math.floor(months / 12)} y ago`
}

export const winratePct = (wins: number, games: number) =>
  games > 0 ? ((wins / games) * 100).toFixed(1) : '—'
