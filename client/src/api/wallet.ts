import { apiRequest } from "./client";

export function getWallet(token: string) {
  return apiRequest<any>("/api/wallet", { token });
}

export function topupWallet(amount: number, token: string) {
  return apiRequest<any>("/api/wallet/topup", {
    method: "POST",
    body: JSON.stringify({ amount }),
    token,
  });
}
