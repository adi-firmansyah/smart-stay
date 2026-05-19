import { Header } from "@/components/Header";
import { NotificationToast } from "@/components/NotificationToast";
import { Sidebar } from "@/components/Sidebar";
import { clearAuthSession, getAuthToken } from "@/lib/auth";
import {
  getRealtimeWebSocketUrl,
  isAccessLogCreatedEvent,
} from "@/lib/realtime";
import { ClipboardList, LayoutDashboard, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FC } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useRevalidator,
} from "react-router";

const NAV_ITEMS = [
  { label: "Dasbor", path: "/dasbor", icon: LayoutDashboard },
  { label: "Data Penghuni", path: "/data-penghuni", icon: Users },
  { label: "Log Aktivitas", path: "/log-aktivitas", icon: ClipboardList },
];

const AppLayout: FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const revalidator = useRevalidator();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    setHasSession(Boolean(getAuthToken()));
  }, []);

  const activeLabel = useMemo((): string => {
    return NAV_ITEMS.find((item) => item.path === pathname)?.label ?? "Dasbor";
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldWatch = pathname === "/dasbor" || pathname === "/log-aktivitas";
    if (!shouldWatch) return;

    const wsRef = { current: null as WebSocket | null };
    let retryCount = 0;
    let reconnectTimer: number | null = null;
    let notifyTimeout: number | null = null;

    const connect = () => {
      const ws = new WebSocket(getRealtimeWebSocketUrl());
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        retryCount = 0;
        // When connection opens, fetch latest data to catch missed sync
        revalidator.revalidate();
      });

      ws.addEventListener("message", (event) => {
        try {
          const payload: unknown = JSON.parse(event.data);
          if (isAccessLogCreatedEvent(payload)) {
            const logData = payload.data as Record<string, unknown>;
            const granted = Boolean(logData.granted);
            const method = String(logData.method || "UNKNOWN");
            const message = granted
              ? `✓ Akses diterima (${method})`
              : `✗ Akses ditolak (${method})`;

            setNotification({
              message,
              type: granted ? "success" : "error",
            });

            // Auto-hide notification after 3s
            if (notifyTimeout) window.clearTimeout(notifyTimeout);
            notifyTimeout = window.setTimeout(() => {
              setNotification(null);
            }, 3000);

            revalidator.revalidate();
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.addEventListener("close", () => {
        // schedule reconnect with exponential backoff
        retryCount += 1;
        const delay = Math.min(30000, 500 * 2 ** retryCount);
        reconnectTimer = window.setTimeout(() => {
          connect();
        }, delay) as unknown as number;
      });
    };

    connect();

    const onOnline = () => revalidator.revalidate();
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("online", onOnline);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (notifyTimeout) window.clearTimeout(notifyTimeout);
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, [pathname, revalidator]);

  const handleLogout = () => {
    clearAuthSession();
    setHasSession(false);
    navigate("/login", { replace: true });
  };

  if (hasSession === null) {
    return null;
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f4f7f3] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.08),_transparent_30%)]" />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Sidebar
        items={NAV_ITEMS}
        isOpen={isSidebarOpen}
        currentPath={pathname}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={activeLabel}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto bg-[linear-gradient(180deg,#f7faf7_0%,#f4f7f3_100%)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
