const AUTH_TOKEN_KEY = "authToken";
const AUTH_ADMIN_KEY = "authAdmin";

export function getAuthToken(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthSession(token: string, admin?: unknown): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);

  if (admin !== undefined) {
    localStorage.setItem(AUTH_ADMIN_KEY, JSON.stringify(admin));
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ADMIN_KEY);
}
