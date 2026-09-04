import React from "react";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import { COLORS, FONT_DISPLAY, primaryBtn } from "./theme.js";
import { FullScreenCenter, Card, Banner, Spinner } from "./components/UI.jsx";
import GoogleDriveSetup from "./components/GoogleDriveSetup.jsx";
import Login from "./components/Login.jsx";
import ChangePassword from "./components/ChangePassword.jsx";
import Shell from "./components/Shell.jsx";

export default function App() {
  return (
    <AppProvider>
      <Gate />
    </AppProvider>
  );
}

function Gate() {
  const { status, error, retry, bootstrapPasswords, clearBootstrapPasswords, session } = useApp();

  if (status === "cargando") {
    return (
      <FullScreenCenter>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Spinner size={26} />
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Conectando con Google Drive…</div>
        </div>
      </FullScreenCenter>
    );
  }

  if (status === "necesita-config") {
    return <GoogleDriveSetup onConnected={retry} />;
  }

  if (status === "error") {
    return (
      <FullScreenCenter>
        <Card>
          <Banner tone="error">{error}</Banner>
          <button style={primaryBtn} onClick={retry}>Reintentar</button>
        </Card>
      </FullScreenCenter>
    );
  }

  if (bootstrapPasswords) {
    return <BootstrapReveal passwords={bootstrapPasswords} onDone={clearBootstrapPasswords} />;
  }

  if (!session) return <Login />;

  if (session.debeCambiarPassword) {
    return <ChangePassword forced onDone={() => {}} />;
  }

  return <Shell />;
}

function BootstrapReveal({ passwords, onDone }) {
  return (
    <FullScreenCenter>
      <Card>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: COLORS.ink, marginBottom: 6 }}>
          Puesta en marcha completada
        </div>
        <p style={{ fontSize: 13, color: COLORS.inkSoft, lineHeight: 1.5, marginTop: 0 }}>
          Se han creado los usuarios iniciales con contraseñas temporales. Apúntalas y repártelas
          de forma segura — <b>no volverán a mostrarse</b>. Cada persona deberá cambiarla en su
          primer inicio de sesión.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {Object.entries(passwords).map(([username, pass]) => (
            <div key={username} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: COLORS.bg, borderRadius: 8, padding: "8px 10px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{username}</span>
              <code style={{ fontSize: 13, color: COLORS.ink }}>{pass}</code>
            </div>
          ))}
        </div>
        <button style={primaryBtn} onClick={onDone}>Ya las he apuntado, continuar</button>
      </Card>
    </FullScreenCenter>
  );
}
