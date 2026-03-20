import { apiRequest } from "./client";

export function getAdminServices(token: string) {
  return apiRequest<any[]>("/api/admin/services", { token });
}

export function deleteAdminService(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/admin/services/${id}`, {
    method: "DELETE",
    token,
  });
}

export function getServices(filters?: any) {
  const query = new URLSearchParams(filters || {}).toString();
  return apiRequest<{ services: any[]; total: number }>(`/api/services${query ? "?" + query : ""}`);
}

export function getService(id: number) {
  return apiRequest<any>(`/api/services/${id}`);
}

export function createService(data: FormData, token: string) {
  return apiRequest<any>("/api/services", {
    method: "POST",
    headers: { "Content-Type": "none" },
    body: data as never,
    token,
  }).catch(() => {
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    return fetch("/api/services", { method: "POST", headers, body: data }).then(async r => {
      const json = await r.json().catch(() => null);
      if (!r.ok) throw new Error(json?.message || "Error");
      return json;
    });
  });
}

export function updateService(id: number, data: FormData, token: string) {
  return apiRequest<any>(`/api/services/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "none" },
    body: data as never,
    token,
  }).catch(() => {
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(`/api/services/${id}`, { method: "PATCH", headers, body: data }).then(async r => {
      const json = await r.json().catch(() => null);
      if (!r.ok) throw new Error(json?.message || "Error");
      return json;
    });
  });
}

export function deleteService(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/services/${id}`, {
    method: "DELETE",
    token,
  });
}
