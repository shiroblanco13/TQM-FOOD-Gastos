export const COLORS = {
  bg: "#F4F6F7",
  paper: "#FFFFFF",
  ink: "#1F2A2E",
  inkSoft: "#6B7A80",
  line: "#E3E9EA",
  amber: "#D97706",
  amberBg: "#FEF3C7",
  green: "#059669",
  greenBg: "#D1FAE5",
  red: "#DC2626",
  redBg: "#FEE2E2",
  navy: "#0D9488",
  navyBg: "#DDF5F2",
};

export const FONT_DISPLAY = "'Inter', sans-serif";

export const CATEGORIAS_GASTO = [
  "Dietas",
  "Transporte",
  "Alojamiento",
  "Material",
  "Cliente / Representación",
  "Otros",
];

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** A partir de una fecha "YYYY-MM-DD" devuelve { year, month, monthIndex } sin problemas de zona horaria. */
export function yearMonthFromFecha(fecha) {
  const [year, monthStr] = String(fecha).split("-");
  const monthIndex = parseInt(monthStr, 10) - 1;
  return { year, month: MESES[monthIndex] || "sin-mes", monthIndex };
}

export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  EMPLEADO: "empleado",
};

export const ROLE_LABEL = {
  [ROLES.SUPERADMIN]: "Superadministrador",
  [ROLES.ADMIN]: "Administrador",
  [ROLES.EMPLEADO]: "Empleado",
};

export const fmtMoney = (n) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "";

export const fmtDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

// --- Estilos reutilizables ---
export const labelStyle = { fontSize: 12, color: COLORS.inkSoft, fontWeight: 600, display: "block", marginBottom: 4, marginTop: 2 };

export const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 11, border: `1.5px solid ${COLORS.line}`,
  marginBottom: 10, fontSize: 14, color: COLORS.ink, background: "#fff",
};

export const primaryBtn = {
  width: "100%", background: COLORS.navy, color: "#fff", border: "none", borderRadius: 12,
  padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer",
  boxShadow: "0 2px 6px rgba(13,148,136,0.28)",
};

export const secondaryBtn = {
  ...primaryBtn,
  background: "#fff",
  color: COLORS.ink,
  border: `1.5px solid ${COLORS.line}`,
  boxShadow: "none",
};

export const dangerBtn = {
  ...primaryBtn,
  background: COLORS.red,
  boxShadow: "0 2px 6px rgba(220,38,38,0.25)",
};
