import { type Resident } from "@/types";
import {
  ArrowLeft,
  DoorOpen,
  Fingerprint,
  ImageIcon,
  Loader2,
  Plus,
  Smartphone,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";
import {
  deleteFaceEmbedding,
  getFaceEmbeddings,
  uploadFaceSamples,
} from "../api";

interface ResidentDetailProps {
  resident: Resident;
  onClose: () => void;
}

const BASE_API_URL: string = import.meta.env.VITE_API_URL;

export const ResidentDetail: FC<ResidentDetailProps> = ({
  resident,
  onClose,
}) => {
  const [embeddings, setEmbeddings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    const fetchSamples = async (): Promise<void> => {
      try {
        const data = await getFaceEmbeddings(resident.id);
        setEmbeddings(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSamples();
  }, [resident.id]);

  const handleDeleteSample = async (embeddingId: string): Promise<void> => {
    if (!window.confirm("Hapus sampel wajah ini?")) return;

    try {
      await deleteFaceEmbedding(resident.id, embeddingId);
      const updatedData = await getFaceEmbeddings(resident.id);
      setEmbeddings(updatedData);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const result = await uploadFaceSamples(resident.id, files);

      alert(
        `Upload Selesai: ${result.total_success} Berhasil, ${result.total_failed} Gagal.`,
      );

      const updatedData = await getFaceEmbeddings(resident.id);
      setEmbeddings(updatedData);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Navigasi */}
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-all text-slate-500 shadow-sm border border-transparent hover:border-slate-100 active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Detail Profil Penghuni
            </h2>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mt-0.5">
              ID: {resident.id}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-10">
        {/* Seksi 1: Informasi Profil Utama */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-slate-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(resident.name)}&size=160&background=random&color=fff`}
                className="w-40 h-40 rounded-3xl object-cover border-4 border-white shadow-2xl transition-transform group-hover:scale-105"
                alt={resident.name}
              />
              <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-center">
              <span className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase tracking-tighter">
                Status: Penghuni Aktif
              </span>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                <User size={12} className="text-blue-500" /> Nama Lengkap
              </label>
              <p className="text-lg font-bold text-slate-800">
                {resident.name}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                <DoorOpen size={12} className="text-blue-500" /> Nomor Kamar
              </label>
              <p className="text-lg font-bold text-slate-800">
                Kamar No. {resident.room_number}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                <Smartphone size={12} className="text-blue-500" /> Kontak
                Telepon
              </label>
              <p className="text-lg font-bold text-slate-800">
                {resident.phone || "Tidak Tersedia"}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                <Fingerprint size={12} className="text-blue-500" /> Biometrik
              </label>
              <p className="text-sm font-medium text-slate-600">
                Terdaftar di Database Wajah
              </p>
            </div>
          </div>
        </div>

        {/* Seksi 2: Manajemen Sampel Wajah */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Fingerprint size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Sampel Wajah Terdaftar
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Data ini digunakan sebagai referensi pengenalan AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                Total: {embeddings.length} Foto
              </span>

              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              <button
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-100 active:scale-95"
              >
                {isUploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                {isUploading ? "Mengunggah..." : "Tambah Sampel"}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <p className="text-sm text-slate-400 font-medium italic">
                Sinkronisasi data wajah...
              </p>
            </div>
          ) : embeddings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {embeddings.map((emb, idx) => (
                <div
                  key={emb.id || idx}
                  className="group flex flex-col items-center gap-3"
                >
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all hover:ring-4 hover:ring-blue-500/10 hover:shadow-xl hover:border-blue-200">
                    <img
                      src={`${BASE_API_URL}/${emb.image_path}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      alt={`Sampel Wajah ${idx + 1}`}
                    />

                    {/* Tombol Hapus: Pojok kanan atas agar tidak tertutup teks */}
                    <button
                      onClick={() => handleDeleteSample(emb.id)}
                      className="absolute top-2.5 right-2.5 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 active:scale-90"
                      title="Hapus Sampel Ini"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                  </div>

                  <div className="text-center px-1">
                    <p className="text-xs font-bold text-slate-700 truncate w-32">
                      Sampel #{idx + 1}
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-tighter font-semibold">
                      Biometric Data
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 transition-colors hover:bg-slate-50">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                <ImageIcon className="text-slate-300" size={36} />
              </div>
              <h4 className="text-slate-800 font-bold text-lg">
                Belum Ada Sampel Wajah
              </h4>
              <p className="text-sm text-slate-500 mb-8 text-center max-w-xs px-6">
                Silakan unggah minimal 1 foto wajah untuk mengaktifkan fitur
                Smart Stay Access Control.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-all"
              >
                Mulai Unggah Sekarang
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
