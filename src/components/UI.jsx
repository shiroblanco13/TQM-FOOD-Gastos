import React from "react";
import { COLORS, FONT_DISPLAY } from "../theme.js";

export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: COLORS.ink, letterSpacing: "-0.01em" }}>{children}</div>
      {action}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div style={{ background: COLORS.paper, border: `1.5px dashed ${COLORS.line}`, borderRadius: 16, padding: 26, textAlign: "center", color: COLORS.inkSoft, fontSize: 13 }}>
      {text}
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background: COLORS.paper, borderRadius: 16, border: `1px solid ${COLORS.line}`, boxShadow: "0 2px 8px rgba(15,42,40,0.05)", padding: 15, ...style }}>
      {children}
    </div>
  );
}

export function Banner({ tone = "info", children }) {
  const map = {
    info: { bg: COLORS.navyBg, color: COLORS.navy },
    error: { bg: COLORS.redBg, color: COLORS.red },
    success: { bg: COLORS.greenBg, color: COLORS.green },
    warn: { bg: COLORS.amberBg, color: COLORS.amber },
  };
  const t = map[tone] || map.info;
  return (
    <div style={{ background: t.bg, color: t.color, borderRadius: 12, padding: "10px 13px", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
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
    navy: { bg: COLORS.navyBg, color: COLORS.navy },
  };
  const t = map[tone] || map.neutral;
  return (
    <span style={{ background: t.bg, color: t.color, fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "3px 9px", letterSpacing: "0.02em" }}>
      {children}
    </span>
  );
}

export function TabBtn({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, border: "none", background: "transparent", padding: "8px 4px 10px", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        color: active ? COLORS.navy : COLORS.inkSoft, position: "relative",
      }}
    >
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 40, height: 26, borderRadius: 999,
        background: active ? COLORS.navyBg : "transparent",
        transition: "background 0.15s ease",
      }}>
        {icon}
      </span>
      <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
      {badge ? (
        <span style={{ position: "absolute", top: 0, right: "22%", background: COLORS.red, color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>{badge}</span>
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
        border: `2.5px solid ${COLORS.line}`, borderTopColor: COLORS.navy,
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
