import React from "react";
import { COLORS, FONT_DISPLAY } from "../theme.js";

export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: COLORS.ink }}>{children}</div>
      {action}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div style={{ background: COLORS.paper, border: `1px dashed ${COLORS.line}`, borderRadius: 10, padding: 24, textAlign: "center", color: COLORS.inkSoft, fontSize: 13 }}>
      {text}
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background: COLORS.paper, borderRadius: 10, border: `1px solid ${COLORS.line}`, boxShadow: "0 1px 3px rgba(28,37,54,0.06)", padding: 14, ...style }}>
      {children}
    </div>
  );
}

export function Banner({ tone = "info", children }) {
  const map = {
    info: { bg: "#E7ECF3", color: COLORS.ink },
    error: { bg: COLORS.redBg, color: COLORS.red },
    success: { bg: COLORS.greenBg, color: COLORS.green },
    warn: { bg: COLORS.amberBg, color: COLORS.amber },
  };
  const t = map[tone] || map.info;
  return (
    <div style={{ background: t.bg, color: t.color, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: COLORS.bg, color: COLORS.inkSoft },
    green: { bg: COLORS.greenBg, color: COLORS.green },
    red: { bg: COLORS.redBg, color: COLORS.red },
    amber: { bg: COLORS.amberBg, color: COLORS.amber },
    navy: { bg: COLORS.ink, color: "#fff" },
  };
  const t = map[tone] || map.neutral;
  return (
    <span style={{ background: t.bg, color: t.color, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 7px", letterSpacing: "0.02em" }}>
      {children}
    </span>
  );
}

export function TabBtn({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, border: "none", background: "transparent", padding: "10px 4px 12px", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        color: active ? COLORS.navy : COLORS.inkSoft, position: "relative",
      }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
      {badge ? (
        <span style={{ position: "absolute", top: 4, right: "28%", background: COLORS.red, color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>{badge}</span>
      ) : null}
    </button>
  );
}

export function StatusMeta(status) {
  if (status === "aprobado") return { label: "APROBADO", tone: "green" };
  if (status === "rechazado") return { label: "RECHAZADO", tone: "red" };
  return { label: "PENDIENTE", tone: "amber" };
}

export function RoleBadge({ rol }) {
  if (rol === "superadmin") return <Badge tone="navy">SUPERADMIN</Badge>;
  if (rol === "admin") return <Badge tone="amber">ADMIN</Badge>;
  return <Badge tone="neutral">EMPLEADO</Badge>;
}

export function Spinner({ size = 18 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${COLORS.line}`, borderTopColor: COLORS.ink,
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

export function FullScreenCenter({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>{children}</div>
    </div>
  );
}
