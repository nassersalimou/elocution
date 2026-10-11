export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isToday(dateStr) {
  return dateStr === getTodayKey();
}

export function isYesterday(dateStr) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dateStr === yesterday;
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0 min';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatRelativeDate(isoDate) {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const dateKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (dateKey(date) === dateKey(today)) return "Aujourd'hui";
  if (dateKey(date) === dateKey(yesterday)) return 'Hier';

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export function groupHistoryByDate(history) {
  const groups = {};
  for (const entry of history) {
    const key = formatRelativeDate(entry.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return groups;
}
