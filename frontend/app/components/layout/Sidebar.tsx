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
}

export const Sidebar: FC<SidebarProps> = ({
  items,
  isOpen,
  currentPath,
  onClose,
}) => {
  return (
    <aside
      className={cn(
        "fixed lg:static inset-y-0 left-0 z-30 w-60 bg-[#4A9174] flex flex-col h-full transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="px-6 pt-6 pb-5 flex items-start justify-between">
        <div>
          <h1 className="text-white text-xl font-bold leading-7">
            Bumi Rafka Kost
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Smart Gate Access Control
          </p>
        </div>
        <button
          className="lg:hidden text-white/70 hover:text-white"
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
        <button className="w-full flex items-center justify-center gap-3 px-6 py-2 border border-[#F8F1F1] rounded-[5px] h-[41px] hover:bg-white/10 transition-colors">
          <LogOut size={25} className="text-white" />
          <span className="font-semibold text-[15px] text-white">Keluar</span>
        </button>
      </div>
    </aside>
  );
};
