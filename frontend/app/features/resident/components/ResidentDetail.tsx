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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Penambahan state refresh key untuk memaksa reload gambar (cache busting)
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());

  const fetchSamples = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = await getFaceEmbeddings(resident.id);
      setEmbeddings(data);
      setRefreshKey(Date.now()); // Update key saat data baru diambil
    } catch (error) {
      console.error("Gagal mengambil sampel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [resident.id]);

  const handleDeleteSample = async (embeddingId: string): Promise<void> => {
    if (!window.confirm("Hapus sampel wajah ini?")) return;

    try {
      await deleteFaceEmbedding(resident.id, embeddingId);
      await fetchSamples(); // Memanggil fungsi fetch yang sudah dibungkus
    } catch (error) {
      alert(`Gagal menghapus: ${(error as Error).message}`);
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

      // Reset input sesegera mungkin
      if (fileInputRef.current) fileInputRef.current.value = "";

      alert(`Berhasil: ${result.total_success}, Gagal: ${result.total_failed}`);

      // Pastikan fetch ulang data terbaru dari server
      await fetchSamples();
    } catch (error) {
      alert(`Gagal mengunggah: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
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
        {/* Seksi Profil - Tetap Sama */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-slate-50">
          <div className="flex flex-col items-center space-y-4">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(resident.name)}&size=160&background=random&color=fff`}
              className="w-40 h-40 rounded-3xl object-cover border-4 border-white shadow-2xl"
              alt={resident.name}
            />
            <span className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase">
              Penghuni Aktif
            </span>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
            <InfoItem
              label="Nama Lengkap"
              value={resident.name}
              icon={<User size={12} />}
            />
            <InfoItem
              label="Nomor Kamar"
              value={`Kamar No. ${resident.room_number}`}
              icon={<DoorOpen size={12} />}
            />
            <InfoItem
              label="Kontak"
              value={resident.phone || "Tidak Tersedia"}
              icon={<Smartphone size={12} />}
            />
            <InfoItem
              label="Biometrik"
              value="Terdaftar di Database"
              icon={<Fingerprint size={12} />}
            />
          </div>
        </div>

        {/* Seksi Manajemen Sampel */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                <Fingerprint size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Sampel Wajah Terdaftar
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Data referensi pengenalan AI
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-100"
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
            <div className="flex flex-col items-center justify-center py-24 space-y-4 text-slate-400">
              <Loader2 className="animate-spin text-emerald-600" size={48} />
              <p className="text-sm font-medium italic">
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
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all hover:ring-4 hover:ring-emerald-500/10">
                    <img
                      // Penggunaan refreshKey untuk menghindari cache browser pada gambar lama
                      src={`${BASE_API_URL}/${emb.image_path}?t=${refreshKey}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      alt={`Sampel ${idx + 1}`}
                    />
                    <button
                      onClick={() => handleDeleteSample(emb.id)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700 truncate w-32">
                      Sampel #{idx + 1}
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">
                      Biometric Data
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState onClick={() => fileInputRef.current?.click()} />
          )}
        </div>
      </div>
    </div>
  );
};

// Komponen Pembantu Minimalis
const InfoItem: FC<{ label: string; value: string; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
      <span className="text-emerald-600">{icon}</span> {label}
    </label>
    <p className="text-lg font-bold text-slate-800">{value}</p>
  </div>
);

const EmptyState: FC<{ onClick: () => void }> = ({ onClick }) => (
  <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
      <ImageIcon className="text-slate-300" size={36} />
    </div>
    <h4 className="text-slate-800 font-bold text-lg text-center">
      Belum Ada Sampel Wajah
    </h4>
    <button
      onClick={onClick}
      className="mt-4 font-bold text-emerald-700 hover:underline"
    >
      Mulai Unggah Sekarang
    </button>
  </div>
);
