// src/utils/roles.ts
export function normRol(rol?: string) {
    const r = (rol || "").toLowerCase();
    if (["oper", "operador", "operator", "op"].includes(r)) return "operador";
    if (["admin", "administrador"].includes(r)) return "admin";
    return ""; // desconocido
  }
  
  export const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
    admin: ["*"], // todo habilitado
    operador: [
      "/monitoreo",   // dashboard de operador
      "/monitor",
      "/formulario",
      "/novedades",
      "/pendientes",
      "/rondin2",
      // agregá o quitá más rutas si hace falta
    ],
  };
  
  export function canAccessPath(rol: string, path: string) {
    const r = normRol(rol);
    if (r === "admin") return true;
    const allow = ROLE_ALLOWED_PATHS[r] || [];
    if (allow.includes("*")) return true;
    return allow.includes(path);
  }
  