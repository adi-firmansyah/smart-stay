import { cn } from "@/lib/utils";
import { LogOut, X, type LucideIcon } from "lucide-react";
import { type FC } from "react";
import { NavLink } from "./NavLink";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: NavItem[];
  isOpen: boolean;
  currentPath: string;
  onClose: () => void;
  onLogout: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  items,
  isOpen,
  currentPath,
  onClose,
  onLogout,
}) => {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex h-full w-60 flex-col border-r border-white/10 bg-[linear-gradient(180deg,#06121f_0%,#0b1b2d_55%,#08131f_100%)] text-white shadow-2xl shadow-slate-900/20 backdrop-blur-xl transition-transform duration-300 lg:static",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="px-6 pt-6 pb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold leading-7 text-white">
            Bumi Rafka Kost
          </h1>
          <p className="mt-1 text-sm text-cyan-200/80">
            Smart Gate Access Control
          </p>
        </div>
        <button
          className="text-white/60 transition-colors hover:text-white lg:hidden"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-5 pt-4 flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            {...item}
            isActive={currentPath === item.path}
            onClick={onClose}
          />
        ))}
      </nav>

      <div className="px-5 pb-6">
        <button
          className="flex h-[41px] w-full items-center justify-center gap-3 rounded-[14px] border border-white/10 px-6 py-2 text-white/90 transition-colors hover:bg-white/10"
          onClick={onLogout}
        >
          <LogOut size={22} className="text-cyan-200" />
          <span className="text-[15px] font-semibold text-white">Keluar</span>
        </button>
      </div>
    </aside>
  );
};
