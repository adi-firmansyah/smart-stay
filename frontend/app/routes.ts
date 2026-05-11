import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/landing-page.tsx"),
  route("login", "routes/login.tsx"),

  layout("layouts/AppLayout.tsx", [
    route("dasbor", "routes/dashboard.tsx"),
    route("data-penghuni", "routes/residents.tsx"),
    route("log-aktivitas", "routes/access-logs.tsx"),
  ]),
] satisfies RouteConfig;
