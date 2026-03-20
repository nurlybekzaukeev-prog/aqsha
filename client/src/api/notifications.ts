import { apiRequest } from "./client";

export function getUnreadCount(token: string) {
  return apiRequest<{ count: number }>("/api/notifications/unread", { token });
}

export function getNotifications(token: string) {
  return apiRequest<any[]>("/api/notifications", { token });
}

export function markAsRead(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/notifications/${id}/read`, {
    method: "PATCH",
    token,
  });
}

export function markAllAsRead(token: string) {
  return apiRequest<{ ok: boolean }>("/api/notifications/read-all", {
    method: "PATCH",
    token,
  });
}
