import React, { useEffect, useState } from "react";
import { Cloud, Copy, Check } from "lucide-react";
import { COLORS, FONT_DISPLAY, primaryBtn, secondaryBtn } from "../theme.js";
import { FullScreenCenter, Card, Banner } from "./UI.jsx";
import {
  hasClientId, startGoogleOAuth, completeGoogleOAuthIfPresent,
  setDevOverrideToken, getDevOverrideToken,
} from "../lib/googleDriveClient.js";

export default function GoogleDriveSetup({ onConnected }) {
  const [phase, setPhase] = useState("intro"); // intro | resultado | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await completeGoogleOAuthIfPresent();
        if (data) {
          setResult(data);
          setDevOverrideToken(data.refresh_token);
          setPhase("resultado");
        }
      } catch (e) {
        setErrorMsg(e.message);
        setPhase("error");
      }
    })();
  }, []);

  function copy(text, key) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  if (phase === "resultado" && result) {
    return (
      <FullScreenCenter>
        <Card>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, marginBottom: 6, color: COLORS.ink }}>
            Google Drive conectado ✅
          </div>
          <Banner tone="success">
            Ya puedes seguir usando la app en este dispositivo para probarla. Para que funcione
            para <b>todo el equipo</b> en producción, copia este refresh token y guárdalo como
            variable de entorno en Netlify.
          </Banner>

          <Field label="GOOGLE_REFRESH_TOKEN" value={result.refresh_token} onCopy={() => copy(result.refresh_token, "rt")} copied={copied === "rt"} />

          <div style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.5, marginTop: 12 }}>
            En Netlify: <b>Site settings → Environment variables</b>, añade (o confirma que ya
            están) estas tres:
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              <li><code>GOOGLE_CLIENT_ID</code> = tu client ID de Google Cloud</li>
              <li><code>GOOGLE_CLIENT_SECRET</code> = tu client secret de Google Cloud</li>
              <li><code>GOOGLE_REFRESH_TOKEN</code> = el valor de arriba</li>
            </ul>
            y vuelve a desplegar el sitio. A partir de ahí, cualquier persona del equipo que
            entre en la app tendrá acceso sin repetir este paso.
          </div>

          <button style={{ ...primaryBtn, marginTop: 16 }} onClick={onConnected}>
            Continuar a la app
          </button>
        </Card>
      </FullScreenCenter>
    );
  }

  if (phase === "error") {
    return (
      <FullScreenCenter>
        <Card>
          <Banner tone="error">{errorMsg}</Banner>
          <button style={secondaryBtn} onClick={() => setPhase("intro")}>Volver a intentar</button>
        </Card>
      </FullScreenCenter>
    );
  }

  return (
    <FullScreenCenter>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Cloud size={20} color={COLORS.ink} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: COLORS.ink }}>
            Configurar Google Drive
          </div>
        </div>

        {!hasClientId() ? (
          <Banner tone="warn">
            Falta la variable <code>VITE_GOOGLE_CLIENT_ID</code>. Crea unas credenciales OAuth en{" "}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
              console.cloud.google.com/apis/credentials
            </a>{" "}
            (tipo "Aplicación web"), habilita la API de Drive para el proyecto, y añade el
            client ID como <code>VITE_GOOGLE_CLIENT_ID</code> antes de continuar. También hace
            falta el client secret como <code>GOOGLE_CLIENT_SECRET</code> (solo en el entorno de
            Netlify, nunca aquí) — sin él, este paso no podrá completarse aunque pulses el botón.
          </Banner>
        ) : (
          <>
            <p style={{ fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 1.5 }}>
              Este paso solo lo hace <b>una vez</b> el superadministrador. Vas a autorizar esta
              app a crear y leer sus propios archivos en tu Google Drive (usuarios, gastos,
              tickets, facturas y exportaciones, dentro de una carpeta "Gastos internos TQM").
              El acceso se guarda de forma segura y no vuelve a pedirse a cada persona del
              equipo.
            </p>
            <p style={{ fontSize: 12, color: COLORS.inkSoft, lineHeight: 1.5, background: COLORS.bg, borderRadius: 8, padding: "8px 10px" }}>
              Si la app de Google todavía no está verificada por Google, es normal ver un aviso
              "Google no ha verificado esta app" — como superadministrador, pulsa "Avanzado" y
              luego "Ir a (nombre de la app), no seguro" para continuar. Solo pasa la primera vez.
            </p>
            <button style={primaryBtn} onClick={startGoogleOAuth}>
              Conectar con Google Drive
            </button>
          </>
        )}

        {getDevOverrideToken() && (
          <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 12, textAlign: "center" }}>
            Ya hay una conexión de prueba guardada en este navegador.{" "}
            <button
              style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}
              onClick={() => setDevOverrideToken(null)}
            >
              Quitarla
            </button>
          </div>
        )}
      </Card>
    </FullScreenCenter>
  );
}

function Field({ label, value, onCopy, copied }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.inkSoft, marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input readOnly value={value} style={{
          flex: 1, fontSize: 12, padding: "8px 9px", borderRadius: 8, border: `1px solid ${COLORS.line}`,
          background: COLORS.bg, color: COLORS.ink, fontFamily: "monospace",
        }} onFocus={(e) => e.target.select()} />
        <button onClick={onCopy} style={{
          border: `1px solid ${COLORS.line}`, background: "#fff", borderRadius: 8, width: 36,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.ink,
        }}>
          {copied ? <Check size={15} color={COLORS.green} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}
