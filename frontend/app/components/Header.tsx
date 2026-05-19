import { AlignJustify } from "lucide-react";
import { type FC } from "react";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export const Header: FC<HeaderProps> = ({ title, onMenuClick }) => {
  return (
    <header className="sticky top-0 z-10 flex h-[90px] flex-shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/85 px-6 shadow-sm backdrop-blur-xl lg:px-10">
      <div className="flex items-center gap-3">
        <button
          className="text-slate-700 transition-colors hover:text-emerald-700 lg:hidden"
          onClick={onMenuClick}
        >
          <AlignJustify size={28} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 lg:text-[30px]">
          {title}
        </h2>
      </div>
    </header>
  );
};
