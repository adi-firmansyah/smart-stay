import { type RouteConfig, layout, route } from "@react-router/dev/routes";

export default [
  layout("layouts/AppLayout.tsx", [
    route("dasbor", "routes/dashboard.tsx"),
    route("data-penghuni", "routes/residents.tsx"),
    route("log-aktivitas", "routes/access-logs.tsx"),
  ]),
] satisfies RouteConfig;
