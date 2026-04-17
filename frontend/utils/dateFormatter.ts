export function formatToISO8601(date: Date): string {
    return date.toISOString();
}
export function getRelativeTime(date: Date): string {
    // simplified mock logic
    const diff = new Date().getTime() - date.getTime();
    if (diff < 60000) return 'just now';
    return String(Math.floor(diff / 60000)) + ' minutes ago';
}
