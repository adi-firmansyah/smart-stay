import { Search } from "lucide-react";
import { type FC } from "react";

interface ResidentFilterProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export const ResidentFilter: FC<ResidentFilterProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Cari berdasarkan nama atau nomor telepon..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchQuery(e.target.value)
          }
          className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm text-gray-700 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
    </div>
  );
};
