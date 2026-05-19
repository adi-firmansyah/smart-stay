import { getAuthToken, setAuthSession } from "@/lib/auth";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { loginAdmin } from "./api";
import type { LoginCredentials } from "./types";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    setHasSession(Boolean(getAuthToken()));
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const creds: LoginCredentials = { username, password };

    try {
      const data = await loginAdmin(creds);
      const token = data.access_token;
      if (token) {
        setAuthSession(token, data.admin);
        navigate("/dasbor", { replace: true });
      } else {
        throw new Error(data.message || "Tidak menerima token");
      }
    } catch (err: any) {
      setError(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  if (hasSession === null) {
    return null;
  }

  if (hasSession) {
    return <Navigate to="/dasbor" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06121f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(94,234,212,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.22),_transparent_38%),linear-gradient(135deg,#06121f_0%,#0b1b2d_55%,#08131f_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center gap-8 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10 lg:p-12">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
              <Sparkles size={16} />
              Smart access dashboard
            </div>

            <div className="space-y-5">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Masuk ke pusat kontrol kost yang lebih rapi dan cepat.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Pantau akses, kelola penghuni, dan lihat log aktivitas dalam
                satu tempat yang lebih bersih, ringan, dan fokus.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: ScanFace, label: "Face recognition" },
                { icon: ShieldCheck, label: "Access monitoring" },
                { icon: Users, label: "Resident control" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200">
                      <Icon size={18} />
                    </div>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-300 shadow-inner">
              <p className="font-medium text-white">Tip</p>
              <p className="mt-2 leading-6">
                Gunakan akun admin untuk membuka dasbor dan memantau event akses
                secara real-time.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/95 p-6 text-slate-900 shadow-[0_30px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/30">
                  <LockKeyhole size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Bumi Rafka Kost
                  </p>
                  <h2 className="text-2xl font-bold text-slate-950">
                    Masuk Admin
                  </h2>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-slate-500 transition hover:text-slate-800"
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span>
                    {loading ? "Sedang masuk…" : "Masuk ke dashboard"}
                  </span>
                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-0.5"
                  />
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
