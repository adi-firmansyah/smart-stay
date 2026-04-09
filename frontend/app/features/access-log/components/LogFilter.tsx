import { Calendar, Filter, Search } from "lucide-react";
import { type FC } from "react";

interface LogFilterProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  dateFilter: string;
  setDateFilter: (val: string) => void;
}

export const LogFilter: FC<LogFilterProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
}) => {
  const handleDateClick = (
    e: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
  ): void => {
    try {
      (e.target as HTMLInputElement).showPicker();
    } catch (err) {
      console.error("Kesalahan saat membuka picker:", err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={18}
        />
        <input
          type="text"
          placeholder="Cari berdasarkan nama..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchQuery(e.target.value)
          }
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all text-gray-700"
        />
      </div>

      <div className="relative flex-1 md:max-w-xs">
        <Filter
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={18}
        />
        <select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(e.target.value)
          }
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all bg-white text-gray-700"
        >
          <option value="All">Semua Status</option>
          <option value="VALID">Valid</option>
          <option value="GAGAL">Gagal</option>
        </select>
      </div>

      <div className="relative flex-1 md:max-w-xs">
        <Calendar
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={18}
        />
        <input
          type="date"
          value={dateFilter}
          onFocus={handleDateClick}
          onClick={handleDateClick}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDateFilter(e.target.value)
          }
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition-all text-gray-700 block cursor-pointer"
        />
      </div>
    </div>
  );
};
