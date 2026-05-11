import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { clearAuthSession, getAuthToken } from "@/lib/auth";
import { ClipboardList, LayoutDashboard, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FC } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";

const NAV_ITEMS = [
  { label: "Dasbor", path: "/dasbor", icon: LayoutDashboard },
  { label: "Data Penghuni", path: "/data-penghuni", icon: Users },
  { label: "Log Aktivitas", path: "/log-aktivitas", icon: ClipboardList },
];

const AppLayout: FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    setHasSession(Boolean(getAuthToken()));
  }, []);

  const activeLabel = useMemo((): string => {
    return NAV_ITEMS.find((item) => item.path === pathname)?.label ?? "Dasbor";
  }, [pathname]);

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
    <div className="flex h-screen overflow-hidden bg-[#F6F6F6]">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        items={NAV_ITEMS}
        isOpen={isSidebarOpen}
        currentPath={pathname}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={activeLabel}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
