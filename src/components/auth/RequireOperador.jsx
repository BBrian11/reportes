import React from "react";
import { useOperadorAuth } from "../../context/OperadorAuthContext.jsx";
import LoginOperador from "../Dashboard/riesgoRondin/LoginOperador.jsx";

export default function RequireOperador({ children }) {
  const { operador } = useOperadorAuth();

  if (!operador) {
    return <LoginOperador />; // Si NO hay sesión → muestra login
  }

  return children; // Si hay sesión → muestra el contenido protegido
}
