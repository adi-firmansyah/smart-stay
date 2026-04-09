import { type AccessLog } from "@/types";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const exportLogsToCSV = (data: AccessLog[]): void => {
  const headers = [
    "Waktu",
    "Nama Penghuni",
    "Metode",
    "Status",
    "Akurasi",
    "Lokasi",
  ];
  const rows = data.map((log) => {
    const d = new Date(log.created_at);
    return [
      `"${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID")}"`,
      `"${log.resident?.name ?? "Unknown"}"`,
      `"${log.method}"`,
      `"${log.granted ? "VALID" : "GAGAL"}"`,
      `"${log.similarity ?? "-"}"`,
      '"Main Gate"',
    ].join(",");
  });

  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Log_Akses_${new Date().toISOString().split("T")}.csv`;
  link.click();
};

export const formatDateFull = (timestamp: string): string => {
  if (!timestamp) return "Format Tidak Valid";

  const date: Date = new Date(timestamp);

  if (isNaN(date.getTime())) return "Format Tidak Valid";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const formatDateShort = (timestamp: string): string => {
  if (!timestamp) return "Format Tidak Valid";

  const date: Date = new Date(timestamp);

  if (isNaN(date.getTime())) return "Format Tidak Valid";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
