import React, { useMemo, useState } from "react";
import { Plus, Receipt, CheckSquare, Download, Users, LogOut, KeyRound } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { canApprove, canExport, canManageUsers } from "../lib/permissions.js";
import { COLORS, FONT_DISPLAY, ROLE_LABEL } from "../theme.js";
import { TabBtn } from "./UI.jsx";
import ExpenseNew from "./ExpenseNew.jsx";
import MyRecords from "./MyRecords.jsx";
import Approvals from "./Approvals.jsx";
import ExportPanel from "./ExportPanel.jsx";
import UserManagement from "./UserManagement.jsx";
import ChangePassword from "./ChangePassword.jsx";

export default function Shell() {
  const { session, logout, gastos } = useApp();
  const [tab, setTab] = useState("nuevo");
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);

  const isApprover = canApprove(session);
  const canSeeExport = canExport(session);
  const canSeeUsers = canManageUsers(session);

  const pendingCount = useMemo(() => gastos.filter((g) => g.estado === "pendiente").length, [gastos]);

  if (showPasswordScreen) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, padding: "20px 14px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <ChangePassword onDone={() => setShowPasswordScreen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", background: COLORS.paper, borderBottom: `1px solid ${COLORS.line}`,
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="TQM Food" style={{ height: 26, display: "block" }} />
          <div style={{ width: 1, height: 26, background: COLORS.line }} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, color: COLORS.ink, lineHeight: 1.2 }}>
              {session.nombre || session.username}
            </div>
            <div style={{ fontSize: 10.5, color: COLORS.inkSoft }}>{ROLE_LABEL[session.rol]}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowPasswordScreen(true)} title="Cambiar contraseña" style={iconBtnStyle}>
            <KeyRound size={17} />
          </button>
          <button onClick={logout} title="Cerrar sesión" style={iconBtnStyle}>
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div style={{ flex: 1, maxWidth: 480, width: "100%", margin: "0 auto", padding: "16px 14px 24px" }}>
        {tab === "nuevo" && <ExpenseNew />}
        {tab === "mios" && <MyRecords />}
        {tab === "aprobar" && isApprover && <Approvals />}
        {tab === "exportar" && canSeeExport && <ExportPanel />}
        {tab === "usuarios" && canSeeUsers && <UserManagement />}
      </div>

      <nav style={{
        display: "flex", borderTop: `1px solid ${COLORS.line}`, background: COLORS.paper,
        position: "sticky", bottom: 0, paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        <TabBtn active={tab === "nuevo"} onClick={() => setTab("nuevo")} icon={<Plus size={18} />} label="Nuevo" />
        <TabBtn active={tab === "mios"} onClick={() => setTab("mios")} icon={<Receipt size={18} />} label="Mis registros" />
        {isApprover && <TabBtn active={tab === "aprobar"} onClick={() => setTab("aprobar")} icon={<CheckSquare size={18} />} label="Aprobar" badge={pendingCount || null} />}
        {canSeeExport && <TabBtn active={tab === "exportar"} onClick={() => setTab("exportar")} icon={<Download size={18} />} label="Exportar" />}
        {canSeeUsers && <TabBtn active={tab === "usuarios"} onClick={() => setTab("usuarios")} icon={<Users size={18} />} label="Usuarios" />}
      </nav>
    </div>
  );
}

const iconBtnStyle = {
  background: "none", border: "none", color: COLORS.inkSoft, cursor: "pointer",
  display: "flex", alignItems: "center", padding: 4,
};
