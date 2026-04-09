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
        "flex items-center gap-3 px-[10px] py-[5px] rounded h-[35px] transition-colors",
        isActive ? "bg-[#545454]" : "hover:bg-white/10",
      )}
    >
      <Icon size={25} className="text-white flex-shrink-0" />
      <span className="font-semibold text-base text-white">{label}</span>
    </Link>
  );
};
