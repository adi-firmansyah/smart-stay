import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Power, Video, Wifi } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";

interface CameraStreamProps {
  streamUrl?: string;
}

export const CameraStream: FC<CameraStreamProps> = ({
  streamUrl = import.meta.env.VITE_ESP32_CAM_STREAM_URL,
}) => {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("camera_live_status");
    if (saved !== null) {
      setIsLive(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("camera_live_status", JSON.stringify(isLive));
  }, [isLive]);

  const toggleLive = (): void => {
    if (!isLive) setError(false);
    setIsLive(!isLive);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
      <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg transition-colors",
              isLive && !error ? "bg-red-50" : "bg-slate-100",
            )}
          >
            <Video
              size={18}
              className={isLive && !error ? "text-red-500" : "text-slate-400"}
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Live Monitoring
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
              {isLive && !error ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-slate-500">Stream Aktif</span>
                </>
              ) : (
                <span className="text-slate-400">
                  {error ? "Koneksi Terputus" : "Stream Nonaktif"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleLive}
            className={cn(
              "p-2 rounded-lg transition-all active:scale-95",
              isLive
                ? "text-emerald-700 hover:bg-emerald-50"
                : "text-slate-400 hover:bg-slate-100",
            )}
            title={isLive ? "Matikan Kamera" : "Nyalakan Kamera"}
          >
            <Power size={18} />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "transition-all duration-500 ease-in-out bg-black overflow-hidden relative",
          isCollapsed ? "max-h-0" : "max-h-[600px]",
        )}
      >
        {streamUrl && isLive && !error ? (
          <div className="w-full flex justify-center items-center bg-black">
            <img
              ref={imgRef}
              src={streamUrl}
              alt="ESP32-CAM Stream"
              className="max-w-full h-auto block mx-auto"
              style={{ aspectRatio: "4/3" }}
              onError={() => setError(true)}
            />
            <div className="absolute top-4 left-4 pointer-events-none">
              <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-white border border-white/10">
                GATE_CAM_01 | LIVE
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center h-full gap-3 text-slate-500 p-6 text-center">
            <div className="p-4 bg-slate-800 rounded-full">
              <Wifi size={32} className="text-slate-600" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              {!isLive ? "Kamera Dimatikan" : "Kamera Terputus"}
            </p>
            {!isLive && (
              <button
                onClick={toggleLive}
                className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-700"
              >
                Aktifkan Stream
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
