import { apiRequest } from "./client";

export function getAdminAdChats(token: string) {
  return apiRequest<any[]>("/api/admin/ad-chats", { token });
}

export function getAdminAdChat(id: number, token: string) {
  return apiRequest<any>(`/api/admin/ad-chats/${id}`, { token });
}

export function getAdChats(adId: number, token: string) {
  return apiRequest<any[]>(`/api/ad-chat/${adId}`, { token });
}

export function getMyAdChats(token: string) {
  return apiRequest<any[]>("/api/ad-chat/my", { token });
}

export function getAdChat(chatId: number, token: string) {
  return apiRequest<any>(`/api/ad-chat/chat/${chatId}`, { token });
}

export function sendMessage(chatId: number, text: string, token: string) {
  return apiRequest<any>(`/api/ad-chat/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
    token,
  });
}
