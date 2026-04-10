import { type Resident } from "@/types";
import { type FC } from "react";

interface ResidentTableProps {
  residents: Resident[];
  onEdit: (resident: Resident) => void;
  onDelete: (id: string) => void;
  onViewDetail: (resident: Resident) => void;
}

export const ResidentTable: FC<ResidentTableProps> = ({
  residents,
  onEdit,
  onDelete,
  onViewDetail,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-gray-100 text-gray-600">
            <th className="pb-4 font-semibold">Nama Penghuni</th>
            <th className="pb-4 font-semibold">Nomor Kamar</th>
            <th className="pb-4 font-semibold">Nomor Telepon</th>
            <th className="pb-4 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {residents.length > 0 ? (
            residents.map((res) => (
              <tr
                key={res.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-3 font-medium text-gray-800">{res.name}</td>
                <td className="py-3 text-gray-600">{res.room_number}</td>
                <td className="py-3 text-gray-600">{res.phone}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {/* Tombol Detail */}
                    <button
                      onClick={() => onViewDetail(res)}
                      className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-colors shadow-sm"
                      title="Lihat Detail"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => onEdit(res)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-md font-medium text-sm transition-colors shadow-sm"
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-md font-medium text-sm transition-colors shadow-sm"
                      onClick={() => onDelete(res.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500">
                Tidak ada data penghuni ditemukan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
