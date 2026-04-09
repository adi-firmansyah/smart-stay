import { type Resident } from "@/types";
import { PlusCircle } from "lucide-react";
import { type FC, useState } from "react";
import { useLoaderData } from "react-router";
import { ResidentFilter } from "./components/ResidentFilter";
import { ResidentTable } from "./components/ResidentTable";

export const ResidentFeature: FC = () => {
  const initialData: Resident[] = (useLoaderData() as Resident[]) ?? [];
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredData: Resident[] = initialData.filter((res: Resident) => {
    const searchLower: string = searchQuery.toLowerCase();
    const name: string = res.name.toLowerCase();
    const phone: string = res.phone ?? "";

    return name.includes(searchLower) || phone.includes(searchQuery);
  });

  const handleAddData = (): void => {
    console.log("Tambah data diklik");
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleAddData}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm text-sm"
        >
          <PlusCircle size={18} />
          Tambah Data
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
        <ResidentFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <ResidentTable residents={filteredData} />
      </div>
    </div>
  );
};
