export function formatLocalTime(dateInput) {
  return new Date(dateInput).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function getTimezoneAbbr() {
  const date = new Date();
  const timeZoneName = date.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();
  return timeZoneName;
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  try {
    const ts = typeof timestamp === 'string'
      ? (timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z')
      : timestamp;
    const date = new Date(ts);
    const diffMs = Date.now() - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return '';
  }
}
