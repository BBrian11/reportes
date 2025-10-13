import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const OperadorAuthContext = createContext(null);

const LS_KEY = "operador:session";

export function OperadorAuthProvider({ children }) {
  const [operador, setOperador] = useState(null); // {id, nombre, usuario, turno}

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setOperador(JSON.parse(raw));
    } catch {}
  }, []);

  const login = (data) => {
    setOperador(data);
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  };

  const logout = () => {
    setOperador(null);
    localStorage.removeItem(LS_KEY);
  };

  const value = useMemo(() => ({ operador, login, logout }), [operador]);

  return (
    <OperadorAuthContext.Provider value={value}>
      {children}
    </OperadorAuthContext.Provider>
  );
}

export function useOperadorAuth() {
  const ctx = useContext(OperadorAuthContext);
  if (!ctx) throw new Error("useOperadorAuth debe usarse dentro de <OperadorAuthProvider>");
  return ctx;
}
