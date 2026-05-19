import { type CreateResidentRequest, type Resident } from "@/types";
import {
  CreditCard,
  DoorOpen,
  LoaderCircle,
  Radio,
  Save,
  ShieldCheck,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { getLatestCapturedRfid } from "../api";

interface ResidentFormProps {
  initialData?: Resident;
  onSave: (data: CreateResidentRequest) => Promise<void>;
  onClose: () => void;
}

export const ResidentForm: FC<ResidentFormProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<CreateResidentRequest>({
    name: initialData?.name ?? "",
    phone: initialData?.phone ?? "",
    room_number: initialData?.room_number ?? 1,
    rfid_code: "",
    pin: "",
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWaitingRfid, setIsWaitingRfid] = useState<boolean>(false);
  const [rfidHint, setRfidHint] = useState<string>("");
  const [latestRfidUid, setLatestRfidUid] = useState<string>("");
  const pollTimeoutRef = useRef<number | null>(null);

  const clearRfidTimeout = (): void => {
    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearRfidTimeout();
    };
  }, []);

  const handleReadRfid = async (): Promise<void> => {
    if (isWaitingRfid) return;

    setIsWaitingRfid(true);
    setLatestRfidUid("");
    setRfidHint(
      "Tekan D di keypad untuk CAPTURE, lalu tap kartu RFID ke reader.",
    );

    try {
      const baseline = await getLatestCapturedRfid(0);
      const baselineEventId = baseline.event_id;
      const startedAt = Date.now();
      const timeoutMs = 30000;

      const poll = async (): Promise<void> => {
        const latest = await getLatestCapturedRfid(baselineEventId);

        if (latest.uid) {
          const rfidUid = latest.uid.toUpperCase();
          setFormData((prev) => ({ ...prev, rfid_code: rfidUid }));
          setLatestRfidUid(rfidUid);
          setRfidHint("✓ UID RFID berhasil diambil dan diisi otomatis.");
          setIsWaitingRfid(false);
          clearRfidTimeout();
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          setRfidHint(
            "⏱ Waktu tunggu habis (30s). Klik Ambil UID RFID untuk retry.",
          );
          setIsWaitingRfid(false);
          clearRfidTimeout();
          return;
        }

        pollTimeoutRef.current = window.setTimeout(() => {
          void poll();
        }, 1000);
      };

      await poll();
    } catch (error) {
      setIsWaitingRfid(false);
      setRfidHint(
        (error as Error).message ||
          "⚠ Gagal membaca RFID. Cek koneksi ke server.",
      );
      clearRfidTimeout();
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {initialData ? "Ubah Data Penghuni" : "Tambah Penghuni Baru"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {initialData
              ? "Kosongkan PIN jika tidak ingin mengubahnya."
              : "Pastikan semua data identitas terisi dengan benar."}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User size={16} className="text-emerald-600" /> Nama Lengkap
            </label>
            <input
              required
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Smartphone size={16} className="text-emerald-600" /> Nomor
              Telepon
            </label>
            <input
              required
              name="phone"
              type="text"
              pattern="^[0-9]+$"
              minLength={10}
              maxLength={20}
              value={formData.phone}
              onChange={handleChange}
              placeholder="Contoh: 08123456789"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <DoorOpen size={16} className="text-emerald-600" /> Nomor Kamar
            </label>
            <input
              required
              name="room_number"
              type="number"
              min={1}
              value={formData.room_number}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>

          {/* RFID Code: Hanya muncul jika BUKAN mode edit */}
          {!initialData && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CreditCard size={16} className="text-emerald-600" /> Kode RFID
              </label>
              <input
                required
                name="rfid_code"
                type="text"
                pattern="^[0-9A-Fa-f]+$"
                value={formData.rfid_code}
                onChange={handleChange}
                placeholder="Contoh: A1B2C3D4"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm uppercase font-mono"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleReadRfid();
                  }}
                  disabled={isWaitingRfid || latestRfidUid !== ""}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isWaitingRfid ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : latestRfidUid ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <Radio size={14} />
                  )}
                  {isWaitingRfid
                    ? "Menunggu UID..."
                    : latestRfidUid
                      ? "UID Terambil"
                      : "Ambil UID RFID"}
                </button>
                {latestRfidUid && (
                  <button
                    type="button"
                    onClick={() => {
                      setLatestRfidUid("");
                      setFormData((prev) => ({
                        ...prev,
                        rfid_code: "",
                      }));
                      setRfidHint("");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <X size={14} />
                    Batal
                  </button>
                )}
              </div>
              {rfidHint && <p className="text-xs text-gray-500">{rfidHint}</p>}
              {latestRfidUid && (
                <p className="text-[11px] font-mono text-emerald-700">
                  UID terakhir: {latestRfidUid}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <ShieldCheck size={16} className="text-emerald-600" /> PIN
              Keamanan
            </label>
            <input
              required={!initialData}
              name="pin"
              type="password"
              minLength={4}
              maxLength={8}
              value={formData.pin}
              onChange={handleChange}
              placeholder={
                initialData ? "Isi hanya jika ingin ganti" : "4-8 digit angka"
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-8 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md shadow-emerald-100"
          >
            <Save size={18} />
            {isLoading
              ? "Menyimpan..."
              : initialData
                ? "Perbarui Data"
                : "Simpan Penghuni"}
          </button>
        </div>
      </form>
    </div>
  );
};
