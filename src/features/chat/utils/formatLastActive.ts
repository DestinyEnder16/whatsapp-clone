// src/features/chat/utils/formatLastActive.ts

interface FormatLastActiveOptions {
  isOnline?: boolean;
  isTyping?: boolean;
  lastActiveAt?: string | null;
  fallback?: string;
}

export function formatLastActive({
  isOnline,
  isTyping,
  lastActiveAt,
  fallback = "Offline",
}: FormatLastActiveOptions): string {
  if (isTyping) {
    return "Typing...";
  }

  if (isOnline) {
    return "Online";
  }

  if (!lastActiveAt) {
    return fallback;
  }

  try {
    const activeDate = new Date(lastActiveAt);
    if (isNaN(activeDate.getTime())) {
      return fallback;
    }

    const now = new Date();
    const diffMs = now.getTime() - activeDate.getTime();

    // In case of clock skew where timestamp is slightly in the future
    if (diffMs < 0) {
      return "Active just now";
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return "Active just now";
    }

    if (diffMinutes < 60) {
      return `Active ${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
    }

    if (diffHours < 24) {
      return `Active ${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    }

    if (diffDays === 1) {
      const hours = activeDate.getHours().toString().padStart(2, "0");
      const mins = activeDate.getMinutes().toString().padStart(2, "0");
      return `Active yesterday at ${hours}:${mins}`;
    }

    if (diffDays < 7) {
      return `Active ${diffDays} days ago`;
    }

    const day = activeDate.getDate().toString().padStart(2, "0");
    const month = (activeDate.getMonth() + 1).toString().padStart(2, "0");
    return `Last seen ${day}/${month}/${activeDate.getFullYear()}`;
  } catch {
    return fallback;
  }
}
