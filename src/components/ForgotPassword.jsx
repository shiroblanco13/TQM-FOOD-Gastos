import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { saveUsuarios } from "../lib/db.js";
import { COLORS, FONT_DISPLAY, inputStyle, labelStyle, primaryBtn } from "../theme.js";
import { Card, FullScreenCenter, Banner } from "./UI.jsx";

export default function ForgotPassword({ onBack }) {
  const { usuarios, usuariosFileId, usuariosModifiedTime, setUsuarios, setUsuariosMeta } = useApp();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const uname = username.trim().toLowerCase();
    const user = usuarios.find((u) => u.username.toLowerCase() === uname);
    if (!user) {
      setError("No existe ningún usuario con ese nombre.");
      return;
    }
    setBusy(true);
    try {
      const { data, fileId, modifiedTime } = await saveUsuarios(usuarios, usuariosFileId, usuariosModifiedTime, (list) =>
        list.map((u) => (u.username === user.username ? { ...u, solicitudReset: true, solicitudResetFecha: Date.now() } : u))
      );
      setUsuarios(data);
      setUsuariosMeta(fileId, modifiedTime);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <FullScreenCenter>
        <Card>
          <Banner tone="success">
            Solicitud registrada. Un administrador te generará una contraseña temporal y te la
            hará llegar. Vuelve a intentar entrar cuando la tengas.
          </Banner>
          <button style={primaryBtn} onClick={onBack}>Volver al inicio de sesión</button>
        </Card>
      </FullScreenCenter>
    );
  }

  return (
    <FullScreenCenter>
      <Card>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.inkSoft, display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 10 }}>
          <ArrowLeft size={14} /> Volver
        </button>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: COLORS.ink, marginBottom: 6 }}>
          Recuperar contraseña
        </div>
        <p style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>
          Como es una app interna sin servidor de correo propio, la recuperación funciona así:
          indicas tu usuario y quedará marcado como pendiente para que un administrador te
          genere una contraseña temporal.
        </p>
        {error && <Banner tone="error">{error}</Banner>}
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Usuario</label>
          <input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="p.ej. m.marin" autoCapitalize="none" />
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Enviando…" : "Solicitar restablecimiento"}
          </button>
        </form>
      </Card>
    </FullScreenCenter>
  );
}
