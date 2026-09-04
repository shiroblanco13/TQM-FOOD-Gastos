export const COLORS = {
  bg: "#ECEEF2",
  paper: "#FFFFFF",
  ink: "#1C2536",
  inkSoft: "#616B80",
  line: "#D9DCE3",
  amber: "#B9832A",
  amberBg: "#F5EAD6",
  green: "#2E6B4F",
  greenBg: "#DFEDE6",
  red: "#AC3A32",
  redBg: "#F5DEDB",
  navy: "#1C2536",
};

export const FONT_DISPLAY = "'Space Grotesk', sans-serif";

export const CATEGORIAS_GASTO = [
  "Dietas",
  "Transporte",
  "Alojamiento",
  "Material",
  "Cliente / Representación",
  "Otros",
];

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
  width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${COLORS.line}`,
  marginBottom: 10, fontSize: 14, color: COLORS.ink, background: "#fff",
};

export const primaryBtn = {
  width: "100%", background: COLORS.navy, color: "#fff", border: "none", borderRadius: 9,
  padding: "11px 0", fontWeight: 600, fontSize: 14, cursor: "pointer",
};

export const secondaryBtn = {
  ...primaryBtn,
  background: "#fff",
  color: COLORS.ink,
  border: `1px solid ${COLORS.line}`,
};

export const dangerBtn = {
  ...primaryBtn,
  background: COLORS.red,
};
