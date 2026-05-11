export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token?: string;
  token_type?: string;
  admin?: Record<string, unknown> | null;
  message?: string;
}
