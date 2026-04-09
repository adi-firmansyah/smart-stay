import { exportLogsToCSV } from "@/lib/utils";
import { type AccessLog } from "@/types";
import { Download } from "lucide-react";
import { type FC, useState } from "react";
import { useLoaderData } from "react-router";
import { LogFilter } from "./components/LogFilter";
import { LogTable } from "./components/LogTable";

export const AccessLogFeature: FC = () => {
  const initialLogs = (useLoaderData() as AccessLog[]) ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const filteredLogs = initialLogs.filter((log: AccessLog) => {
    if (!log) return false;

    const name: string = log.resident?.name ?? "Orang Tidak Dikenal";
    const statusLabel: string = log.granted ? "VALID" : "GAGAL";
    const logDate: string = new Date(log.created_at)
      .toISOString()
      .split("T")[0];

    const matchesSearch: boolean = name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesStatus: boolean =
      statusFilter === "All" || statusLabel === statusFilter;

    const matchesDate: boolean = dateFilter === "" || logDate === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => exportLogsToCSV(filteredLogs)}
          className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-md font-medium transition-colors shadow-sm"
        >
          <Download size={18} />
          Export ke CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
        <LogFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
        />

        <LogTable logs={filteredLogs} />
      </div>
    </div>
  );
};
