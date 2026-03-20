export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit & { token?: string | null }
): Promise<T> {
  const headers = new Headers(options?.headers || {});
  if (!(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(url, { ...options, headers });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message || "API request failed", response.status, data);
  }

  return data as T;
}
