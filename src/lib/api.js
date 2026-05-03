const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export function apiFetch(path, init = {}) {
  return fetch(apiUrl(path), {
    credentials: "include",
    ...init,
  });
}
