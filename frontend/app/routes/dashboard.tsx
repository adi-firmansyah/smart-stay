import { DashboardFeature } from "@/features/dashboard";
import { getDashboardData } from "@/features/dashboard/api";
import type { Route } from "./+types/dashboard";

export async function loader({}: Route.LoaderArgs) {
  return await getDashboardData();
}

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Dashboard | Bumi Rafka Kost" },
    { name: "description", content: "Smart Gate Access Control Dashboard" },
  ];
};

export default function DashboardRoute() {
  return <DashboardFeature />;
}
