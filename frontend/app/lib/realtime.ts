const API_URL = import.meta.env.VITE_API_URL;

export function getRealtimeWebSocketUrl(): string {
  const explicitWsUrl = import.meta.env.VITE_WS_URL;
  if (explicitWsUrl) {
    return explicitWsUrl;
  }

  try {
    const url = new URL(API_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/events";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return `${API_URL.replace(/^http/, "ws")}/ws/events`;
  }
}

export interface RealtimeAccessLogEvent {
  type: "access_log.created";
  data: Record<string, unknown>;
}

export function isAccessLogCreatedEvent(
  payload: unknown,
): payload is RealtimeAccessLogEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    (payload as RealtimeAccessLogEvent).type === "access_log.created"
  );
}
