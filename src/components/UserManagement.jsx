import React, { useState } from "react";
import { UserPlus, KeyRound, Trash2, ShieldAlert } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { saveUsuarios, saveConfig } from "../lib/db.js";
import { hashPassword, generateTempPassword } from "../lib/crypto.js";
import {
  canManageUsers, canAssignRole, canEditUser, canDeleteUser, violatesProtection, canConfigureDrive,
} from "../lib/permissions.js";
import { COLORS, FONT_DISPLAY, ROLES, ROLE_LABEL, inputStyle, labelStyle, primaryBtn, secondaryBtn, dangerBtn } from "../theme.js";
import { SectionTitle, EmptyState, Card, Banner, Badge, RoleBadge } from "./UI.jsx";

export default function UserManagement() {
  const { session, usuarios, usuariosFileId, usuariosModifiedTime, setUsuarios, setUsuariosMeta } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [tempReveal, setTempReveal] = useState(null); // { username, password }
  const [editing, setEditing] = useState(null); // username

  if (!canManageUsers(session)) return <EmptyState text="No tienes permiso para gestionar usuarios." />;

  const pendientesReset = usuarios.filter((u) => u.solicitudReset);
  const asignableRoles = session.rol === ROLES.SUPERADMIN ? [ROLES.EMPLEADO, ROLES.ADMIN, ROLES.SUPERADMIN] : [ROLES.EMPLEADO];

  async function mutate(mutateFn) {
    setError("");
    try {
      const { data, fileId, modifiedTime } = await saveUsuarios(usuarios, usuariosFileId, usuariosModifiedTime, mutateFn);
      setUsuarios(data);
      setUsuariosMeta(fileId, modifiedTime);
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }

  async function crearUsuario(form) {
    const uname = form.username.trim().toLowerCase();
    if (!uname || !form.nombre.trim()) throw new Error("Rellena usuario y nombre.");
    if (usuarios.some((u) => u.username.toLowerCase() === uname)) throw new Error("Ese usuario ya existe.");
    if (!canAssignRole(session, form.rol)) throw new Error("No tienes permiso para asignar ese rol.");

    const temp = generateTempPassword();
    const { salt, hash, iterations } = await hashPassword(temp);
    const nuevo = {
      username: uname, nombre: form.nombre.trim(), rol: form.rol, protegido: false, activo: true,
      passwordSalt: salt, passwordHash: hash, passwordIter: iterations,
      debeCambiarPassword: true, solicitudReset: false, creadoEn: Date.now(),
    };
    await mutate((list) => [...list, nuevo]);
    setTempReveal({ username: uname, password: temp });
    setShowNew(false);
  }

  async function resetearPassword(target) {
    if (!canEditUser(session, target)) return setError("No tienes permiso para restablecer la contraseña de este usuario.");
    const temp = generateTempPassword();
    const { salt, hash, iterations } = await hashPassword(temp);
    await mutate((list) => list.map((u) => (u.username === target.username
      ? { ...u, passwordSalt: salt, passwordHash: hash, passwordIter: iterations, debeCambiarPassword: true, solicitudReset: false }
      : u)));
    setTempReveal({ username: target.username, password: temp });
  }

  async function toggleActivo(target) {
    const changes = { activo: !target.activo };
    if (!canEditUser(session, target)) return setError("No tienes permiso para modificar este usuario.");
    if (violatesProtection(target, changes)) return setError("Este usuario está protegido y no puede desactivarse.");
    await mutate((list) => list.map((u) => (u.username === target.username ? { ...u, ...changes } : u)));
  }

  async function cambiarRol(target, rol) {
    const changes = { rol };
    if (!canEditUser(session, target)) return setError("No tienes permiso para modificar este usuario.");
    if (!canAssignRole(session, rol)) return setError("No tienes permiso para asignar ese rol.");
    if (violatesProtection(target, changes)) return setError("Este usuario está protegido y no puede cambiar de rol.");
    await mutate((list) => list.map((u) => (u.username === target.username ? { ...u, ...changes } : u)));
  }

  async function eliminarUsuario(target) {
    if (!canDeleteUser(session, target)) return setError("No tienes permiso para eliminar este usuario.");
    if (!window.confirm(`¿Eliminar a ${target.nombre} (${target.username})? Esta acción no se puede deshacer.`)) return;
    await mutate((list) => list.filter((u) => u.username !== target.username));
  }

  return (
    <div>
      <SectionTitle action={
        <button onClick={() => setShowNew((v) => !v)} style={{
          background: "none", border: "none", color: COLORS.ink, display: "flex", alignItems: "center",
          gap: 4, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}>
          <UserPlus size={15} /> Nuevo
        </button>
      }>Usuarios</SectionTitle>

      {error && <Banner tone="error">{error}</Banner>}

      {tempReveal && (
        <Banner tone="success">
          Contraseña temporal para <b>{tempReveal.username}</b>: <code style={{ fontSize: 13 }}>{tempReveal.password}</code>
          <br />Compártela de forma segura; deberá cambiarla en su próximo inicio de sesión.
          <div>
            <button onClick={() => setTempReveal(null)} style={{ background: "none", border: "none", color: COLORS.green, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, marginTop: 4 }}>
              Entendido
            </button>
          </div>
        </Banner>
      )}

      {showNew && <NewUserForm asignableRoles={asignableRoles} onCancel={() => setShowNew(false)} onCreate={crearUsuario} />}

      {pendientesReset.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.amber, marginBottom: 6, marginTop: 4 }}>
            Solicitudes de restablecimiento pendientes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {pendientesReset.map((u) => (
              <Card key={u.username} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{u.nombre}</div>
                  <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>{u.username}</div>
                </div>
                {canEditUser(session, u) ? (
                  <button onClick={() => resetearPassword(u)} style={{ ...primaryBtn, width: "auto", padding: "7px 12px", fontSize: 12 }}>
                    Generar contraseña
                  </button>
                ) : <Badge tone="neutral">Sin permiso</Badge>}
              </Card>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {usuarios.map((u) => (
          <UserRow
            key={u.username}
            user={u}
            isSelf={u.username === session.username}
            editable={canEditUser(session, u)}
            deletable={canDeleteUser(session, u)}
            asignableRoles={asignableRoles}
            onToggleActivo={() => toggleActivo(u)}
            onCambiarRol={(rol) => cambiarRol(u, rol)}
            onResetPassword={() => resetearPassword(u)}
            onDelete={() => eliminarUsuario(u)}
          />
        ))}
      </div>

      {canConfigureDrive(session) && <TarifaKmSettings />}
    </div>
  );
}

function TarifaKmSettings() {
  const { config, configFileId, configModifiedTime, setConfig, setConfigMeta } = useApp();
  const [valor, setValor] = useState(String(config?.tarifaKm ?? 0.26));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    const n = Number(valor.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    setBusy(true);
    setSaved(false);
    try {
      const { data, fileId, modifiedTime } = await saveConfig(config, configFileId, configModifiedTime, (c) => ({ ...c, tarifaKm: n }));
      setConfig(data);
      setConfigMeta(fileId, modifiedTime);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginTop: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Ajustes</div>
      <form onSubmit={guardar} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Tarifa por kilómetro (€/km)</label>
          <input style={{ ...inputStyle, marginBottom: 0 }} value={valor} onChange={(e) => { setValor(e.target.value); setSaved(false); }} inputMode="decimal" />
        </div>
        <button type="submit" disabled={busy} style={{ ...primaryBtn, width: "auto", padding: "9px 16px", opacity: busy ? 0.6 : 1 }}>
          {busy ? "…" : "Guardar"}
        </button>
      </form>
      {saved && <div style={{ fontSize: 11.5, color: COLORS.green, marginTop: 6 }}>Guardado.</div>}
    </Card>
  );
}

function NewUserForm({ asignableRoles, onCancel, onCreate }) {
  const [form, setForm] = useState({ username: "", nombre: "", rol: asignableRoles[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate(form);
      setForm({ username: "", nombre: "", rol: asignableRoles[0] });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Nuevo usuario</div>
      {error && <Banner tone="error">{error}</Banner>}
      <form onSubmit={submit}>
        <label style={labelStyle}>Usuario (para iniciar sesión)</label>
        <input style={inputStyle} value={form.username} placeholder="p.ej. j.perez" autoCapitalize="none"
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
        <label style={labelStyle}>Nombre completo</label>
        <input style={inputStyle} value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
        <label style={labelStyle}>Rol</label>
        <select style={inputStyle} value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}>
          {asignableRoles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>{busy ? "Creando…" : "Crear usuario"}</button>
          <button type="button" onClick={onCancel} style={secondaryBtn}>Cancelar</button>
        </div>
      </form>
    </Card>
  );
}

function UserRow({ user: u, isSelf, editable, deletable, asignableRoles, onToggleActivo, onCambiarRol, onResetPassword, onDelete }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: COLORS.ink }}>{u.nombre}</span>
            <RoleBadge rol={u.rol} />
            {u.protegido && <Badge tone="amber"><ShieldAlert size={10} style={{ verticalAlign: -1 }} /> Protegido</Badge>}
            {!u.activo && <Badge tone="red">Inactivo</Badge>}
            {isSelf && <Badge tone="neutral">Tú</Badge>}
          </div>
          <div style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 }}>{u.username}</div>
        </div>
      </div>

      {editable && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, borderTop: `1px solid ${COLORS.line}`, paddingTop: 10 }}>
          {!u.protegido && (
            <select
              value={u.rol}
              onChange={(e) => onCambiarRol(e.target.value)}
              style={{ fontSize: 11.5, padding: "5px 7px", borderRadius: 7, border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.ink }}
            >
              {[...new Set([u.rol, ...asignableRoles])].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          )}
          {!u.protegido && (
            <SmallBtn onClick={onToggleActivo} tone={u.activo ? "warn" : "ok"}>
              {u.activo ? "Desactivar" : "Reactivar"}
            </SmallBtn>
          )}
          <SmallBtn onClick={onResetPassword} icon={<KeyRound size={12} />}>Resetear contraseña</SmallBtn>
          {deletable && (
            <SmallBtn onClick={onDelete} tone="danger" icon={<Trash2 size={12} />}>Eliminar</SmallBtn>
          )}
        </div>
      )}
    </Card>
  );
}

function SmallBtn({ onClick, children, icon, tone = "default" }) {
  const toneStyle = {
    default: { border: COLORS.line, color: COLORS.ink, bg: "#fff" },
    warn: { border: COLORS.amber, color: COLORS.amber, bg: "#fff" },
    ok: { border: COLORS.green, color: COLORS.green, bg: "#fff" },
    danger: { border: COLORS.red, color: COLORS.red, bg: "#fff" },
  }[tone];
  return (
    <button onClick={onClick} style={{
      border: `1px solid ${toneStyle.border}`, background: toneStyle.bg, color: toneStyle.color,
      borderRadius: 7, padding: "5px 9px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 4,
    }}>
      {icon}{children}
    </button>
  );
}
