import type { AuthResponse, LoginCredentials } from "./types";

const BASE_API_URL = import.meta.env.VITE_API_URL;

export async function loginAdmin(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || "Login failed");
    }
    return data as AuthResponse;
  }

  if (!res.ok) throw new Error("Login failed");
  return {} as AuthResponse;
}
