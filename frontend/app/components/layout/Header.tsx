import { AlignJustify } from "lucide-react";
import { type FC } from "react";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export const Header: FC<HeaderProps> = ({ title, onMenuClick }) => {
  return (
    <header className="bg-white shadow-[0_-1px_4px_0_rgba(0,0,0,0.25)] h-[90px] px-6 lg:px-10 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          className="text-[#1E1E1E] hover:text-[#4A9174] lg:hidden"
          onClick={onMenuClick}
        >
          <AlignJustify size={28} />
        </button>
        <h2 className="text-[#1D293D] font-bold text-2xl lg:text-[30px]">
          {title}
        </h2>
      </div>
    </header>
  );
};
