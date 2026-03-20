import { apiRequest } from "./client";

export function getOrders(token: string, role?: string) {
  return apiRequest<any[]>(`/api/orders${role ? "?role=" + role : ""}`, { token });
}

export function getOrder(id: number, token: string) {
  return apiRequest<any>(`/api/orders/${id}`, { token });
}

export function createOrder(data: any, token: string) {
  return apiRequest<any>("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export function acceptOrder(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/orders/${id}/accept`, {
    method: "PATCH",
    token,
  });
}

export function submitReview(id: number, rating: number, comment: string, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/orders/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
    token,
  });
}

export function freezeOrder(id: number, reason: string, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/orders/${id}/freeze`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
    token,
  });
}

export function unfreezeOrder(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/orders/${id}/unfreeze`, {
    method: "PATCH",
    token,
  });
}

export function payOrder(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/orders/${id}/pay`, {
    method: "POST",
    token,
  });
}

export function sendOrderMessage(id: number, text: string, token: string) {
  return apiRequest<any>(`/api/orders/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
    token,
  });
}
