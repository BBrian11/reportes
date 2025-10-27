import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AdminAuthContext = createContext(null);
const LS_KEY = "admin:session";

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);     // {id, email, nombre, rol}
  const [hydrated, setHydrated] = useState(false); // 👈 clave: sabemos cuándo ya leímos localStorage

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setAdmin(JSON.parse(raw));
    } catch (e) {
      console.warn("No se pudo leer admin:session:", e);
    } finally {
      setHydrated(true); // 👈 marcamos hidratado SIEMPRE
    }
  }, []);

  const login = (data) => {
    setAdmin(data);
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem(LS_KEY);
  };

  const value = useMemo(() => ({ admin, hydrated, login, logout }), [admin, hydrated]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth debe usarse dentro de <AdminAuthProvider>");
  return ctx;
}
