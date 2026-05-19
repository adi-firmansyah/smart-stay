import {
  CheckCircle2,
  Droplets,
  Home,
  ScanFace,
  ShieldCheck,
  Wifi,
  Zap,
} from "lucide-react";
import { useEffect, useState, type FC, type MouseEvent } from "react";
import { AccessMonitorMockup } from "./components/AccessMonitorMockup";
import { CTASection } from "./components/CTASection";
import { FeatureCard } from "./components/FeatureCard";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";
import { RoomCard } from "./components/RoomCard";
import { RoomDetailModal } from "./components/RoomDetailModal";
import { ScrollToTop } from "./components/ScrollToTop";
import { SectionContainer } from "./components/SectionContainer";

const LandingPage: FC = () => {
  const [activeSection, setActiveSection] = useState<string>("home");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [selectedRoom, setSelectedRoom] = useState<{
    title: string;
    video: string;
  } | null>(null);

  useEffect((): (() => void) => {
    const handleScroll = (): void => {
      const sections: string[] = ["home", "fitur", "kamar", "location"];
      const scrollPosition: number = window.scrollY + 100;

      for (const id of sections) {
        const element = document.getElementById(id);

        if (element) {
          const offsetTop: number = element.offsetTop;
          const height: number = element.offsetHeight;

          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + height
          ) {
            setActiveSection(id);
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (
    e: MouseEvent<HTMLAnchorElement>,
    id: string,
  ): void => {
    e.preventDefault();

    const element = document.getElementById(id);

    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  return (
    <div className="font-sans text-slate-800 bg-white min-h-screen">
      <Navbar activeSection={activeSection} onScroll={scrollToSection} />

      <HeroSection onCheckRooms={scrollToSection} />

      {/* FITUR */}
      <SectionContainer id="fitur" className="bg-white">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e293b] mb-4">
            Teknologi Smart-Stay
          </h2>

          <p className="text-slate-500">
            Satu-satunya kost dengan integrasi sistem keamanan wajah dan
            pemantauan real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureCard
              title="AI Face Recognition"
              description="Akses gerbang utama tanpa kunci fisik dalam 0.5 detik."
              icon={<ScanFace size={24} />}
              accentColor="dark"
            />

            <FeatureCard
              title="High-Speed WiFi"
              description="Koneksi internet stabil untuk kebutuhan kerja dan hiburan."
              icon={<Wifi size={24} />}
              accentColor="teal"
            />

            <FeatureCard
              title="Smart Monitoring"
              description="Pantau status akses gerbang melalui dashboard penghuni."
              icon={<ShieldCheck size={24} />}
              accentColor="indigo"
            />

            <FeatureCard
              title="All-In Cost"
              description="Biaya sewa sudah termasuk iuran listrik dan air bersih."
              icon={<Zap size={24} />}
              accentColor="dark"
            />
          </div>

          <AccessMonitorMockup />
        </div>
      </SectionContainer>

      {/* KAMAR */}
      <SectionContainer id="kamar" className="bg-slate-50">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e293b] mb-4">
            Pilihan Tipe Kamar
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PAVILIUN */}
          <RoomCard
            title="Tipe Paviliun Lengkap"
            description="Hunian luas dengan pembagian ruangan layaknya rumah mungil, cocok untuk kenyamanan ekstra."
            images={[
              "/images/studio-1.jpeg",
              "/images/studio-2.jpeg",
              "/images/studio-3.jpeg",
            ]}
            price="Rp 850.000"
            units={6}
            features={[
              { label: "Ruang Tamu", icon: Home },
              { label: "Dapur & R. Cuci", icon: Droplets },
              { label: "K. Mandi Dalam", icon: CheckCircle2 },
            ]}
            onDetailClick={() => {
              setSelectedRoom({
                title: "Tipe Paviliun Lengkap",
                video: "/videos/studio.mp4",
              });

              setIsModalOpen(true);
            }}
          />

          {/* STUDIO */}
          <RoomCard
            title="Tipe Studio Standard"
            description="Kamar minimalis fungsional dengan fasilitas esensial lengkap untuk efisiensi harian."
            images={[
              "/images/pavilliun-1.jpeg",
              "/images/pavilliun-2.jpeg",
              "/images/pavilliun-3.jpeg",
            ]}
            price="Rp 850.000"
            units={2}
            features={[
              { label: "Kamar Tidur", icon: Home },
              { label: "K. Mandi Dalam", icon: CheckCircle2 },
              { label: "WiFi Gratis", icon: Wifi },
            ]}
            onDetailClick={() => {
              setSelectedRoom({
                title: "Tipe Studio Standard",
                video: "/videos/pavilliun.mp4",
              });

              setIsModalOpen(true);
            }}
          />
        </div>
      </SectionContainer>

      <CTASection />

      <Footer />

      {/* MODAL */}
      <RoomDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        video={selectedRoom?.video || ""}
        title={selectedRoom?.title || ""}
      />

      <ScrollToTop />
    </div>
  );
};

export default LandingPage;
