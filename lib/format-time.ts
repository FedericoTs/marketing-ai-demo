/**
 * Format seconds into human-readable time
 * - > 24 hours: displayed as days (e.g., "2d 5h")
 * - > 60 minutes: displayed as hours (e.g., "3h 45m")
 * - > 0: displayed as minutes (e.g., "15m")
 * - < 1 minute: displayed as seconds (e.g., "45s")
 */
export function formatEngagementTime(seconds: number | null) {
  if (!seconds) return null;

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  // If > 24 hours, display as days
  if (days > 0) {
    return {
      value: days + (hours / 24),
      unit: "days",
      display: hours > 0 ? `${days}d ${hours}h` : `${days}d`,
      seconds: seconds,
    };
  }
  // If > 60 minutes, display as hours
  else if (hours > 0 || minutes > 60) {
    return {
      value: hours + (minutes / 60),
      unit: "hours",
      display: minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`,
      seconds: seconds,
    };
  }
  // Otherwise display as minutes
  else if (minutes > 0) {
    return {
      value: minutes + (secs / 60),
      unit: "minutes",
      display: `${minutes}m`,
      seconds: seconds,
    };
  }
  // Less than a minute
  else {
    return {
      value: seconds,
      unit: "seconds",
      display: `${secs}s`,
      seconds: seconds,
    };
  }
}
