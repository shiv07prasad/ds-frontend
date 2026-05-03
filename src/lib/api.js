const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export const CF_ACCESS_LOGIN_URL =
  "https://giga-cracked.cloudflareaccess.com/cdn-cgi/access/login/ds-backend.krs-prasad07.workers.dev";

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export function apiFetch(path, init = {}) {
  return fetch(apiUrl(path), {
    credentials: "include",
    ...init,
  });
}
