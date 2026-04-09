import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ClipboardList, LayoutDashboard, Users } from "lucide-react";
import { useMemo, useState, type FC } from "react";
import { Outlet, useLocation } from "react-router";

const NAV_ITEMS = [
  { label: "Dasbor", path: "/dasbor", icon: LayoutDashboard },
  { label: "Data Penghuni", path: "/data-penghuni", icon: Users },
  { label: "Log Aktivitas", path: "/log-aktivitas", icon: ClipboardList },
];

const AppLayout: FC = () => {
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const activeLabel = useMemo((): string => {
    return NAV_ITEMS.find((item) => item.path === pathname)?.label ?? "Dasbor";
  }, [pathname]);

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
