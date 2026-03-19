import { apiRequest } from "./client";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  university: string;
  isVerified: boolean;
  iin: string;
  fullName: string;
  idCardUrl: string;
  verificationStatus: "pending" | "approved" | "rejected";
  isBlocked: boolean;
  balance: number;
  createdAt: string;
};

export type AdminStats = {
  users: number;
  ads: number;
  services: number;
  orders: number;
  pendingVerifications: number;
  totalRevenue: number;
};

export type AdminOrder = {
  id: number;
  serviceId: number;
  serviceTitle: string;
  price: number;
  clientId: number;
  clientName: string;
  providerId: number;
  providerName: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  completedAt?: string;
};

export function verifyUser(
  userId: number | string,
  token: string,
  verified = true,
  adminMfaToken?: string | null
) {
  return apiRequest<{ ok: boolean; verified: boolean }>(`/api/admin/users/${userId}/verify`, {
    method: "PATCH",
    token,
    headers: adminMfaToken ? { "X-Admin-MFA": adminMfaToken } : undefined,
    body: JSON.stringify({ verified }),
  });
}

export function getAdminOrders(token: string) {
  return apiRequest<AdminOrder[]>("/api/admin/orders", { token });
}

export function approveAdminOrder(orderId: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/admin/orders/${orderId}/approve`, {
    method: "POST",
    token,
  });
}

export function getAdminStats(token: string) {
  return apiRequest<AdminStats>("/api/admin/stats", { token });
}

export function getAdminUsers(token: string, status?: string) {
  const query = status ? `?status=${status}` : "";
  return apiRequest<AdminUser[]>(`/api/admin/users${query}`, { token });
}

export function deleteAdminUser(userId: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/admin/users/${userId}`, {
    method: "DELETE",
    token,
  });
}

export function blockAdminUser(userId: number, token: string, blocked: boolean) {
  return apiRequest<{ ok: boolean; blocked: boolean }>(`/api/admin/users/${userId}/block`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ blocked }),
  });
}
