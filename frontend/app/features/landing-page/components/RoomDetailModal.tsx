import { CheckCircle2, Info, X } from "lucide-react";
import { type FC, type ReactNode } from "react";

interface FacilityGroupProps {
  title: string;
  icon: ReactNode;
  items: string[];
}

const FacilityGroup: FC<FacilityGroupProps> = ({ title, icon, items }) => (
  <div>
    <div className="flex items-center gap-2 mb-4 text-[#1e293b]">
      {icon}
      <h4 className="font-bold">{title}</h4>
    </div>

    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((item: string, index: number) => (
        <li key={index} className="flex items-center text-sm text-slate-600">
          <CheckCircle2 size={16} className="text-teal-500 mr-2 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: string;
  title: string;
}

export const RoomDetailModal: FC<RoomDetailModalProps> = ({
  isOpen,
  onClose,
  video,
  title,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1e293b]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in fade-in zoom-in duration-200">
        {/* HEADER */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-[#1e293b]">
              <Info size={24} />
            </div>

            <h3 className="text-2xl font-bold text-[#1e293b]">
              Informasi {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 md:p-8 space-y-8">
          {/* VIDEO */}
          <div>
            <h4 className="text-xl font-bold text-[#1e293b] mb-4">
              Video Tour {title}
            </h4>

            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <video
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-[250px] md:h-[450px] object-cover"
              >
                <source src={video} type="video/mp4" />
                Browser kamu tidak mendukung video.
              </video>
            </div>
          </div>

          {/* FASILITAS */}
          <FacilityGroup
            title="Fasilitas Kamar (All-In)"
            icon={<Info size={20} />}
            items={[
              "Kasur & Bantal",
              "Lemari Pakaian",
              "Meja & Kursi Kerja",
              "Kamar Mandi Dalam",
              "WiFi High-Speed",
              "Token Listrik (Free Limit)",
            ]}
          />

          {/* HARGA */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h4 className="text-lg font-bold text-[#1e293b] mb-2">
                Skema Harga
              </h4>

              <p className="text-sm text-slate-600">
                Harga sewa kost dimulai dari{" "}
                <span className="font-bold text-[#1e293b]">
                  Rp 850.000 / bulan
                </span>
                . Apabila membawa alat elektronik daya tinggi (Kulkas, dsb),
                harga maksimal{" "}
                <span className="font-bold text-[#1e293b]">
                  Rp 950.000 / bulan
                </span>
                .
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full md:w-auto bg-[#1e293b] text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors shrink-0"
            >
              Tutup Detail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
