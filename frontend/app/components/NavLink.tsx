import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { type FC } from "react";
import { Link } from "react-router";

interface NavLinkProps {
  label: string;
  path: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

export const NavLink: FC<NavLinkProps> = ({
  label,
  path,
  icon: Icon,
  isActive,
  onClick,
}) => {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        "flex h-[38px] items-center gap-3 rounded-2xl px-3 py-2 transition-all",
        isActive
          ? "border border-white/10 bg-white/10 text-white shadow-sm"
          : "text-white/70 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon
        size={22}
        className={cn(
          "flex-shrink-0 transition-colors",
          isActive ? "text-cyan-200" : "text-white/55",
        )}
      />
      <span className="text-base font-semibold">{label}</span>
    </Link>
  );
};
