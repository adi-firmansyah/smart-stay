import {
  getRealtimeWebSocketUrl,
  isAccessLogCreatedEvent,
} from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { AccessMethod, type AccessLog } from "@/types";
import { ImageIcon } from "lucide-react";
import { useEffect, useState, type FC } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface ActivityTableProps {
  accessLogs: AccessLog[];
}

export const ActivityTable: FC<ActivityTableProps> = ({ accessLogs }) => {
  const [logs, setLogs] = useState<AccessLog[]>(accessLogs ?? []);

  useEffect(() => {
    setLogs(accessLogs ?? []);
  }, [accessLogs]);

  useEffect(() => {
    const ws = new WebSocket(getRealtimeWebSocketUrl());

    const onMessage = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data);
        if (isAccessLogCreatedEvent(payload)) {
          const newLog = payload.data as unknown as AccessLog;
          setLogs((prev) => {
            // ignore if already present
            if (prev.some((l) => l.id === newLog.id)) return prev;
            // Prepend new log and keep list reasonably sized
            const updated = [newLog, ...prev];
            return updated.slice(0, 50);
          });
        }
      } catch {
        // ignore malformed
      }
    };

    ws.addEventListener("message", onMessage);

    return () => {
      ws.removeEventListener("message", onMessage);
      ws.close();
    };
  }, []);

  const formatMethod = (method: AccessMethod): string => {
    const methods: Record<AccessMethod, string> = {
      [AccessMethod.FACE_RECOGNITION]: "Face Recognition",
      [AccessMethod.RFID]: "RFID",
      [AccessMethod.PIN]: "PIN",
    };
    return methods[method] || method;
  };

  const getStatusConfig = (isGranted: boolean) => {
    return {
      label: isGranted ? "VALID" : "GAGAL",
      className: isGranted
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-600",
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-6">
        Aktivitas Terkini
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100 text-gray-600">
              <th className="pb-4 font-semibold">Waktu</th>
              <th className="pb-4 font-semibold">Nama Penghuni</th>
              <th className="pb-4 font-semibold">Metode Akses</th>
              <th className="pb-4 font-semibold">Status</th>
              <th className="pb-4 font-semibold">Akurasi</th>
              <th className="pb-4 font-semibold">Foto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.length > 0 ? (
              logs.map((log) => {
                const statusCfg = getStatusConfig(log.granted);
                const timeStr = new Date(log.created_at).toLocaleTimeString(
                  "id-ID",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 text-gray-500">{timeStr}</td>
                    <td className="py-4 font-medium text-gray-800">
                      {log.resident?.name ?? (
                        <span className="text-red-500">
                          Orang Tidak Dikenal
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-gray-600">
                      {formatMethod(log.method)}
                    </td>
                    <td className="py-4">
                      <div
                        className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide",
                          statusCfg.className,
                        )}
                      >
                        {statusCfg.label}
                      </div>
                    </td>
                    <td className="py-4 text-gray-600">
                      {log.similarity ? `${log.similarity}%` : "-"}
                    </td>
                    <td className="py-4">
                      {log.image_path ? (
                        <div className="relative group w-12 h-12">
                          <img
                            src={`${API_BASE_URL}/${log.image_path}`}
                            alt="Suspicious Log"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm transition-transform group-hover:scale-125 group-hover:z-10 cursor-zoom-in"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-300">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  Belum ada aktivitas hari ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
