import { ExternalLink, MessageCircle } from "lucide-react";
import { type FC } from "react";
import { SectionContainer } from "./SectionContainer";

export const CTASection: FC = () => {
  return (
    <SectionContainer id="location" className="bg-[#1e293b] py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Siap Bergabung dengan Komunitas Kami?
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Kunjungi lokasi kami atau hubungi admin via WhatsApp untuk
            konsultasi mengenai ketersediaan unit dan jadwal survei lokasi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-teal-500 text-[#1e293b] px-8 py-4 rounded-xl font-bold flex items-center justify-center hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
            >
              <MessageCircle className="mr-2" size={20} />
              Hubungi via WhatsApp
            </a>
            <a
              href="https://maps.app.goo.gl/8UTZuKFbktkWgAbT6"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-xl font-bold flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              <ExternalLink className="mr-2" size={20} />
              Buka Google Maps
            </a>
          </div>
        </div>

        <div className="h-[400px] bg-slate-800 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.7438667790334!2d107.82529947435177!3d-6.55398556406853!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e693bba88885eb9%3A0x29ec86df73ee1160!2sBumi%20Rafka%20Kost!5e0!3m2!1sid!2sid!4v1778141343107!5m2!1sid!2sid"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
          />
        </div>
      </div>
    </SectionContainer>
  );
};
