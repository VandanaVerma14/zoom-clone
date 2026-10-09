// Every call to the backend goes through this file.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
// Same server over WebSocket (http -> ws, https -> wss), used for WebRTC signaling
export const WS_URL = API_URL.replace(/^http/, "ws");

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // FastAPI sends errors as { detail: "message" } or { detail: [ {msg} ] }
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg.replace("Value error, ", "")).join(", ")
      : detail || "Something went wrong";
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  getMe: () => request("/api/users/me"),

  createInstantMeeting: () => request("/api/meetings/instant", { method: "POST", body: {} }),
  scheduleMeeting: (data) => request("/api/meetings/schedule", { method: "POST", body: data }),
  getUpcoming: () => request("/api/meetings/upcoming"),
  getRecent: () => request("/api/meetings/recent"),
  getMeeting: (code) => request(`/api/meetings/${code}`),

  joinMeeting: (code, data) => request(`/api/meetings/${code}/join`, { method: "POST", body: data }),
  getParticipants: (code) => request(`/api/meetings/${code}/participants`),
  updateParticipant: (code, id, data) =>
    request(`/api/meetings/${code}/participants/${id}`, { method: "PATCH", body: data }),
  leaveMeeting: (code, id) => request(`/api/meetings/${code}/participants/${id}/leave`, { method: "POST" }),

  // Chat
  getMessages: (code, afterId = 0) => request(`/api/meetings/${code}/messages?after_id=${afterId}`),
  sendMessage: (code, participantId, message) =>
    request(`/api/meetings/${code}/messages`, { method: "POST", body: { participant_id: participantId, message } }),

  // Host controls
  muteAll: (code, hostId) =>
    request(`/api/meetings/${code}/mute-all`, { method: "POST", body: { host_participant_id: hostId } }),
  removeParticipant: (code, id, hostId) =>
    request(`/api/meetings/${code}/participants/${id}/remove`, {
      method: "POST",
      body: { host_participant_id: hostId },
    }),
  endMeeting: (code, hostId) =>
    request(`/api/meetings/${code}/end`, { method: "POST", body: { host_participant_id: hostId } }),

  // Used when the tab is closed; sendBeacon still works while the page unloads
  leaveOnUnload: (code, id) => {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(`${API_URL}/api/meetings/${code}/participants/${id}/leave`);
    }
  },
};
