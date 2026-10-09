// Small helpers for showing data nicely.

/** "8123456789" -> "812 345 6789" (how Zoom displays meeting IDs) */
export function formatMeetingCode(code = "") {
  return code.replace(/^(\d{3})(\d{3})(\d+)$/, "$1 $2 $3");
}

/**
 * Accepts a meeting ID ("812 345 6789", "812-345-6789") or an invite link
 * ("https://site.com/j/8123456789") and returns just the digits, or null.
 */
export function parseMeetingInput(input = "") {
  const text = input.trim();
  const fromLink = text.match(/\/j\/(\d{9,11})/) || text.match(/\/meeting\/(\d{9,11})/);
  if (fromLink) return fromLink[1];
  const digits = text.replace(/[\s-]/g, "");
  return /^\d{9,11}$/.test(digits) ? digits : null;
}

/**
 * Invite link for a meeting, built from the site you are on right now (so it is correct on
 * localhost and when deployed). Falls back to the backend's link outside the browser.
 */
export function inviteLink(meeting) {
  if (typeof window === "undefined") return meeting.invite_link;
  return `${window.location.origin}/j/${meeting.meeting_code}`;
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  return h ? `${h} hr` : `${m} min`;
}

export function isToday(iso) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Picks a stable colour for an avatar based on the name. */
export function avatarColor(name = "") {
  const colors = ["#0B5CFF", "#7B61FF", "#00A67E", "#E8590C", "#D6336C", "#1098AD", "#5C7CFA"];
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[sum % colors.length];
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
