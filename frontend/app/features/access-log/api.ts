import { type AccessLog } from "@/types";

const BASE_API_URL: string = import.meta.env.VITE_API_URL;

export async function getAccessLogs(): Promise<AccessLog[]> {
  const response = await fetch(`${BASE_API_URL}/access-logs`);

  if (!response.ok) {
    throw new Error("Gagal mengambil data log aktivitas dari server");
  }

  return response.json();
}
