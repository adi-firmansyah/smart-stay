import { AccessLogFeature } from "@/features/access-log";
import { getAccessLogs } from "@/features/access-log/api";
import type { Route } from "./+types/access-logs";

export async function loader({}: Route.LoaderArgs) {
  return await getAccessLogs();
}

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Log Aktivitas | Bumi Rafka Kost" },
    { name: "description", content: "Lihat log aktivitas akses penghuni kost" },
  ];
};

export default function AccessLogsRoute() {
  return <AccessLogFeature />;
}
