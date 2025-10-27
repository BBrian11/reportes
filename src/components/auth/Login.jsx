// components/auth/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../services/firebase";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");

  // Si ya hay sesión, decidir adónde ir
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setBooting(false);
        return;
      }
      // Si está logueado, vemos si es admin
      const isAdmin = await checkIsAdmin(user);
      navigate(isAdmin ? "/admin" : "/", { replace: true });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkIsAdmin = async (user) => {
    const byUidRef = doc(db, "administracion", user.uid);
    const byUidSnap = await getDoc(byUidRef);
    if (byUidSnap.exists()) return true;

    const q = query(collection(db, "administracion"), where("email", "==", user.email || email), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
      const isAdmin = await checkIsAdmin(user);
      navigate(isAdmin ? "/admin" : "/", { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err?.code === "auth/invalid-credential"
          ? "Email o contraseña inválidos."
          : err?.message || "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  if (booting) return <div style={{ padding: 16 }}>Cargando…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-1">Acceso</h1>
        <p className="text-sm text-gray-500 mb-6">Ingresá con tu usuario y contraseña.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring focus:ring-purple-200"
              placeholder="usuario@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring focus:ring-purple-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl px-4 py-2 font-medium text-white ${
              loading ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500">
      
        </div>
      </div>
    </div>
  );
}
