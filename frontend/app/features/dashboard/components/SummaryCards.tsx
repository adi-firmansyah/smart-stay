import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, UserCheck, XCircle } from "lucide-react";
import { type FC } from "react";
import type { DashboardData, SummaryCardProps } from "../types";

const Card: FC<SummaryCardProps> = ({
  label,
  value,
  icon: Icon,
  colorClass,
  bgColorClass,
  borderColorClass,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
    <div className={cn("h-1", borderColorClass)} />
    <div className="flex items-center justify-between p-5">
      <div>
        <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
      </div>
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          bgColorClass,
          colorClass,
        )}
      >
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export const SummaryCards: FC<{ data: DashboardData }> = ({ data }) => {
  const cards: SummaryCardProps[] = [
    {
      label: "Jumlah Penghuni",
      value: data.total_residents,
      icon: UserCheck,
      colorClass: "text-emerald-700",
      bgColorClass: "bg-emerald-50",
      borderColorClass: "bg-emerald-500",
    },
    {
      label: "Akses Hari Ini",
      value: data.total_access_today,
      icon: Clock,
      colorClass: "text-cyan-700",
      bgColorClass: "bg-cyan-50",
      borderColorClass: "bg-cyan-500",
    },
    {
      label: "Akses Valid",
      value: data.total_valid_access,
      icon: CheckCircle2,
      colorClass: "text-slate-700",
      bgColorClass: "bg-slate-100",
      borderColorClass: "bg-slate-400",
    },
    {
      label: "Akses Tidak Valid",
      value: data.total_invalid_access,
      icon: XCircle,
      colorClass: "text-rose-600",
      bgColorClass: "bg-rose-50",
      borderColorClass: "bg-rose-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i} {...card} />
      ))}
    </div>
  );
};
