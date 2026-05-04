const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
let authTokenProvider = null;

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export function setAuthTokenProvider(provider) {
  authTokenProvider = provider;
}

export async function apiFetch(path, init = {}) {
  const headers = new Headers(init.headers || {});
  if (authTokenProvider) {
    const token = await authTokenProvider();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  return fetch(apiUrl(path), {
    credentials: "include",
    ...init,
    headers,
  });
}
