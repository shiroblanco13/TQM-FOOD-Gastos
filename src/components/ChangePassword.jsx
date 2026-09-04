import React, { useState } from "react";
import { KeyRound } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { saveUsuarios } from "../lib/db.js";
import { hashPassword, verifyPassword } from "../lib/crypto.js";
import { COLORS, FONT_DISPLAY, inputStyle, labelStyle, primaryBtn, secondaryBtn } from "../theme.js";
import { Card, FullScreenCenter, Banner, SectionTitle } from "./UI.jsx";

/** `forced`: true cuando el usuario debe cambiar la contraseña antes de continuar (sin opción a cancelar). */
export default function ChangePassword({ forced = false, onDone }) {
  const { session, usuarios, usuariosFileId, usuariosModifiedTime, setUsuarios, setUsuariosMeta, updateSessionFlag } = useApp();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repite, setRepite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (nueva.length < 6) return setError("La nueva contraseña debe tener al menos 6 caracteres.");
    if (nueva !== repite) return setError("Las contraseñas nuevas no coinciden.");

    setBusy(true);
    try {
      const user = usuarios.find((u) => u.username === session.username);
      const ok = await verifyPassword(actual, user.passwordSalt, user.passwordHash, user.passwordIter);
      if (!ok) throw new Error("La contraseña actual no es correcta.");

      const { salt, hash, iterations } = await hashPassword(nueva);
      const { data, fileId, modifiedTime } = await saveUsuarios(usuarios, usuariosFileId, usuariosModifiedTime, (list) =>
        list.map((u) => (u.username === session.username
          ? { ...u, passwordSalt: salt, passwordHash: hash, passwordIter: iterations, debeCambiarPassword: false }
          : u))
      );
      setUsuarios(data);
      setUsuariosMeta(fileId, modifiedTime);
      updateSessionFlag({ debeCambiarPassword: false });
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <KeyRound size={18} color={COLORS.ink} />
        <SectionTitle>{forced ? "Cambia tu contraseña" : "Cambiar contraseña"}</SectionTitle>
      </div>
      {forced && (
        <p style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: -6, lineHeight: 1.5 }}>
          Tu contraseña es temporal. Elige una nueva antes de continuar.
        </p>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Contraseña actual</label>
        <input style={inputStyle} type="password" value={actual} onChange={(e) => setActual(e.target.value)} />
        <label style={labelStyle}>Nueva contraseña</label>
        <input style={inputStyle} type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <label style={labelStyle}>Repite la nueva contraseña</label>
        <input style={inputStyle} type="password" value={repite} onChange={(e) => setRepite(e.target.value)} />
        <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Guardando…" : "Guardar nueva contraseña"}
        </button>
        {!forced && (
          <button type="button" onClick={onDone} style={{ ...secondaryBtn, marginTop: 8 }}>
            Cancelar
          </button>
        )}
      </form>
    </Card>
  );

  return forced ? <FullScreenCenter>{content}</FullScreenCenter> : content;
}
