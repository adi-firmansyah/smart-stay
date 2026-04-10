import { cn, formatDateFull } from "@/lib/utils";
import { type AccessLog, AccessMethod } from "@/types";
import { AlertCircle, Image as ImageIcon } from "lucide-react";
import { type FC } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const LogTable: FC<{ logs: AccessLog[] }> = ({ logs }) => {
  const getMethodBadgeClass = (method: AccessMethod) => {
    switch (method) {
      case AccessMethod.FACE_RECOGNITION:
        return "bg-purple-100 text-purple-600";
      case AccessMethod.RFID:
        return "bg-blue-100 text-blue-600";
      case AccessMethod.PIN:
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-gray-100 text-gray-600">
            <th className="pb-4 font-semibold">Waktu</th>
            <th className="pb-4 font-semibold">Nama Penghuni</th>
            <th className="pb-4 font-semibold">Metode</th>
            <th className="pb-4 font-semibold">Status</th>
            <th className="pb-4 font-semibold">Akurasi</th>
            <th className="pb-4 font-semibold">Foto Mencurigakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.length > 0 ? (
            logs.map((log) => {
              const dateObj = new Date(log.created_at);
              return (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-4">
                    <div className="font-medium text-gray-800">
                      {formatDateFull(log.created_at)}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {dateObj.toLocaleTimeString("id-ID")}
                    </div>
                  </td>
                  <td className="py-4 font-medium text-gray-700">
                    {log.resident?.name ?? (
                      <span className="text-red-500 flex items-center gap-1.5 font-bold">
                        <AlertCircle size={14} />
                        Orang Tidak Dikenal
                      </span>
                    )}
                  </td>
                  <td className="py-4">
                    <span
                      className={cn(
                        "px-3 py-1 text-[11px] font-semibold rounded-full uppercase tracking-tighter",
                        getMethodBadgeClass(log.method),
                      )}
                    >
                      {log.method.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-4">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold",
                        log.granted
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600",
                      )}
                    >
                      {log.granted ? "VALID" : "GAGAL"}
                    </div>
                  </td>
                  <td className="py-4">
                    {log.similarity ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              log.similarity > 80
                                ? "bg-green-500"
                                : "bg-red-500",
                            )}
                            style={{ width: `${log.similarity}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {log.similarity}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-4">
                    {log.suspicious_image_path ? (
                      <div className="relative group w-12 h-12">
                        <img
                          src={`${API_BASE_URL}/${log.suspicious_image_path}`}
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
              <td
                colSpan={6}
                className="py-12 text-center text-gray-500 italic"
              >
                Tidak ada aktivitas ditemukan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
