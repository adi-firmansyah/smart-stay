import { type Resident } from "@/types";
import { type FC } from "react";

export const ResidentTable: FC<{ residents: Resident[] }> = ({ residents }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-gray-100 text-gray-600">
            <th className="pb-4 font-semibold">Nama Penghuni</th>
            <th className="pb-4 font-semibold">Nomor Kamar</th>
            <th className="pb-4 font-semibold">Nomor Telepon</th>
            <th className="pb-4 font-semibold">Foto</th>
            <th className="pb-4 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {residents.length > 0 ? (
            residents.map((res, index) => (
              <tr
                key={res.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-3 font-medium text-gray-800">{res.name}</td>
                <td className="py-3 text-gray-600">{res.room_number}</td>
                <td className="py-3 text-gray-600">{res.phone}</td>
                <td className="py-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(res.name)}&background=random&color=fff`}
                    alt={res.name}
                    className="w-12 h-12 object-cover rounded-full border border-gray-200"
                  />
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-md font-medium text-sm transition-colors">
                      Edit
                    </button>
                    <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-md font-medium text-sm transition-colors">
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
