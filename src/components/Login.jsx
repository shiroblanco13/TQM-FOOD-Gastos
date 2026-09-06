import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { COLORS, FONT_DISPLAY, inputStyle, labelStyle, primaryBtn } from "../theme.js";
import { FullScreenCenter, Card, Banner } from "./UI.jsx";
import ForgotPassword from "./ForgotPassword.jsx";

export default function Login() {
  const { login } = useApp();
  const [mode, setMode] = useState("login"); // login | olvide
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Rellena usuario y contraseña.");
      return;
    }
    setBusy(true);
    try {
      await login(username, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (mode === "olvide") {
    return <ForgotPassword onBack={() => setMode("login")} />;
  }

  return (
    <FullScreenCenter>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{
          background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 14, display: "inline-flex",
          alignItems: "center", justifyContent: "center", margin: "0 auto 14px", padding: "14px 20px",
          boxShadow: "0 1px 3px rgba(28,37,54,0.06)",
        }}>
          <img src="/logo.png" alt="TQM Food" style={{ height: 40, display: "block" }} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, color: COLORS.ink }}>
          Gastos internos
        </div>
        <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>TQM Food</div>
      </div>

      <Card>
        {error && <Banner tone="error">{error}</Banner>}
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Usuario</label>
          <input
            style={inputStyle}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="p.ej. m.marin"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <label style={labelStyle}>Contraseña</label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <button
          onClick={() => setMode("olvide")}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontSize: 12.5, marginTop: 12, cursor: "pointer", width: "100%", textAlign: "center" }}
        >
          He olvidado mi contraseña
        </button>
      </Card>
    </FullScreenCenter>
  );
}
