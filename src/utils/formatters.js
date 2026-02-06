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
