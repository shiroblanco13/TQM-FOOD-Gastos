import React, { useMemo, useState } from "react";
import { Car, Receipt, Paperclip } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { getViewUrl } from "../lib/db.js";
import { COLORS, fmtDate, fmtMoney } from "../theme.js";
import { SectionTitle, EmptyState, Card, Badge, StatusMeta } from "./UI.jsx";

export default function MyRecords() {
  const { session, gastos } = useApp();

  const mios = useMemo(
    () => gastos.filter((g) => g.username === session.username).sort((a, b) => b.creadoEn - a.creadoEn),
    [gastos, session]
  );

  return (
    <div>
      <SectionTitle>Mis registros</SectionTitle>
      {mios.length === 0 ? (
        <EmptyState text="Todavía no has enviado ningún gasto ni kilometraje." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {mios.map((g) => <RecordCard key={g.id} record={g} />)}
        </div>
      )}
    </div>
  );
}

export function RecordCard({ record: g, showUser = false }) {
  const [linkBusy, setLinkBusy] = useState(false);
  const meta = StatusMeta(g.estado);

  async function verAdjunto() {
    if (!g.adjunto) return;
    setLinkBusy(true);
    try {
      const url = await getViewUrl(g.adjunto.fileId);
      window.open(url, "_blank");
    } catch (e) {
      alert("No se pudo abrir el adjunto: " + e.message);
    } finally {
      setLinkBusy(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: COLORS.bg,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {g.tipo === "kilometraje" ? <Car size={15} color={COLORS.inkSoft} /> : <Receipt size={15} color={COLORS.inkSoft} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: COLORS.ink }}>
              {g.tipo === "kilometraje" ? `${g.origen || "?"} → ${g.destino || "?"}` : g.categoria}
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 1 }}>
              {showUser ? `${g.username} · ` : ""}{fmtDate(g.fecha)}
              {g.tipo === "kilometraje" ? ` · ${g.km} km` : ""}
            </div>
            {g.descripcion && <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 3 }}>{g.descripcion}</div>}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.ink }}>{fmtMoney(g.importe)}</div>
          <div style={{ marginTop: 4 }}><Badge tone={meta.tone}>{meta.label}</Badge></div>
        </div>
      </div>
      {(g.adjunto || g.notaRevision) && (
        <div style={{ borderTop: `1px solid ${COLORS.line}`, marginTop: 10, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          {g.notaRevision ? (
            <span style={{ fontSize: 11.5, color: COLORS.inkSoft, fontStyle: "italic" }}>"{g.notaRevision}"</span>
          ) : <span />}
          {g.adjunto && (
            <button onClick={verAdjunto} disabled={linkBusy} style={{
              background: "none", border: "none", color: COLORS.ink, fontSize: 11.5, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0,
            }}>
              <Paperclip size={12} /> {linkBusy ? "Abriendo…" : "Ver adjunto"}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
