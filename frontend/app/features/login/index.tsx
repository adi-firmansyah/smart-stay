import { getAuthToken, setAuthSession } from "@/lib/auth";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { loginAdmin } from "./api";
import type { LoginCredentials } from "./types";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 border rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Masuk Admin</h1>

        <form onSubmit={handleSubmit}>
          <label className="block mb-2 text-sm font-medium">Username</label>
          <input
            className="w-full mb-4 px-3 py-2 border rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />

          <label className="block mb-2 text-sm font-medium">Password</label>
          <input
            type="password"
            className="w-full mb-4 px-3 py-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="text-red-600 mb-4">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-2 rounded"
          >
            {loading ? "Sedang masuk…" : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
