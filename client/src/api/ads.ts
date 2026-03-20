import { apiRequest } from "./client";
import type { Ad } from "../types";

export interface AdsFilters {
  category?: string;
  university?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: string;
  limit?: number;
  offset?: number;
  favorites?: number[];
}

export function getAds(filters?: AdsFilters) {
  const query = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        if (Array.isArray(v)) {
          if (v.length) query.append(k, v.join(","));
        } else {
          query.append(k, String(v));
        }
      }
    });
  }
  const qStr = query.toString();
  return apiRequest<{ ads: Ad[]; total: number }>(`/api/ads${qStr ? "?" + qStr : ""}`);
}

export function getMyAds(token: string) {
  return apiRequest<Ad[]>("/api/ads/my", { token });
}

export function getAd(id: number) {
  return apiRequest<Ad>(`/api/ads/${id}`);
}

export function createAd(data: FormData, token: string) {
  return apiRequest<Ad>("/api/ads", {
    method: "POST",
    headers: { "Content-Type": "none" }, // fetch sets boundary for FormData
    body: data as never, // Remove default content-type header logic manually below
    token,
  }).catch(() => {
    // Custom wrapper for FormData to omit default content-type
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    return fetch("/api/ads", { method: "POST", headers, body: data }).then(async r => {
      const json = await r.json().catch(() => null);
      if (!r.ok) throw new Error(json?.message || "Error");
      return json as Ad;
    });
  });
}

export function updateAdStatus(id: number, status: string, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/ads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    token,
  });
}

export function deleteAd(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/ads/${id}`, {
    method: "DELETE",
    token,
  });
}

export function getMeta() {
  return apiRequest<{ categories: string[]; defaultUniversity: string }>("/api/ads/meta");
}

export function getAdminAds(token: string) {
  return apiRequest<Ad[]>("/api/admin/ads", { token });
}

export function deleteAdminAd(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/api/admin/ads/${id}`, {
    method: "DELETE",
    token,
  });
}
