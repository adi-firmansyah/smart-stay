import { type CreateResidentRequest, type Resident } from "@/types";
import { PlusCircle } from "lucide-react";
import { type FC, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import {
  createResident,
  deleteResident,
  getResidentDetail,
  updateResident,
} from "./api";
import { ResidentDetail } from "./components/ResidentDetail";
import { ResidentFilter } from "./components/ResidentFilter";
import { ResidentForm } from "./components/ResidentForm";
import { ResidentTable } from "./components/ResidentTable";

export const ResidentFeature: FC = () => {
  const initialData: Resident[] = (useLoaderData() as Resident[]) ?? [];
  const revalidator = useRevalidator();

  // Hapus state isFormOpen, cukup gunakan viewMode
  const [viewMode, setViewMode] = useState<"table" | "form" | "detail">(
    "table",
  );
  const [selectedResident, setSelectedResident] = useState<
    Resident | undefined
  >(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredData: Resident[] = initialData.filter((res: Resident) => {
    if (!res) return false;
    const searchLower: string = searchQuery.toLowerCase();
    const name: string = res.name.toLowerCase();
    const phone: string = res.phone?.toLowerCase() ?? "";
    return name.includes(searchLower) || phone.includes(searchLower);
  });

  // Perbaikan fungsi handleClose agar kembali ke mode table
  const handleCloseForm = (): void => {
    setViewMode("table");
    setSelectedResident(undefined);
  };

  const handleSaveResident = async (
    data: CreateResidentRequest,
  ): Promise<void> => {
    try {
      if (selectedResident) {
        const payload: Partial<CreateResidentRequest> = { ...data };
        if (!payload.pin) delete payload.pin;
        if (!payload.rfid_code) delete payload.rfid_code;

        await updateResident(
          selectedResident.id,
          payload as CreateResidentRequest,
        );
      } else {
        await createResident(data);
      }

      handleCloseForm();
      revalidator.revalidate();
    } catch (error) {
      alert(
        "Gagal memproses data penghuni. Error: " + (error as Error).message,
      );
    }
  };

  const handleOpenDetail = async (id: string): Promise<void> => {
    try {
      const detail = await getResidentDetail(id);
      setSelectedResident(detail);
      setViewMode("detail");
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleDeleteResident = async (id: string): Promise<void> => {
    const confirmed: boolean = window.confirm(
      "Apakah Anda yakin ingin menghapus data penghuni ini? Tindakan ini tidak dapat dibatalkan.",
    );
    if (!confirmed) return;

    try {
      await deleteResident(id);
      revalidator.revalidate();
    } catch (error) {
      alert("Gagal menghapus data: " + (error as Error).message);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      {viewMode === "table" && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSelectedResident(undefined); // Pastikan data bersih untuk data baru
              setViewMode("form"); // Ubah viewMode ke form
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm text-sm"
          >
            <PlusCircle size={18} />
            Tambah Data
          </button>
        </div>
      )}

      {viewMode === "form" && (
        <ResidentForm
          initialData={selectedResident}
          onSave={handleSaveResident}
          onClose={handleCloseForm}
        />
      )}

      {viewMode === "detail" && selectedResident && (
        <ResidentDetail
          resident={selectedResident}
          onClose={() => setViewMode("table")}
        />
      )}

      {viewMode === "table" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
          <ResidentFilter
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <ResidentTable
            residents={filteredData}
            onEdit={(res) => {
              setSelectedResident(res);
              setViewMode("form");
            }}
            onDelete={handleDeleteResident}
            onViewDetail={(res) => handleOpenDetail(res.id)}
          />
        </div>
      )}
    </div>
  );
};
