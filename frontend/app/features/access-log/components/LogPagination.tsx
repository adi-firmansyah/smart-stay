import { ChevronLeft, ChevronRight } from "lucide-react";
import { type FC } from "react";

interface LogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const LogPagination: FC<LogPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const startItem: number = (currentPage - 1) * itemsPerPage + 1;
  const endItem: number = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
      <div className="text-sm text-gray-500">
        Menampilkan{" "}
        <span className="font-semibold text-gray-800">{startItem}</span> -{" "}
        <span className="font-semibold text-gray-800">{endItem}</span> dari{" "}
        <span className="font-semibold text-gray-800">{totalItems}</span> data
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-gray-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                currentPage === page
                  ? "bg-[#10b981] text-white shadow-sm"
                  : "text-gray-600 hover:bg-slate-50 border border-transparent hover:border-gray-200"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-gray-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
};
