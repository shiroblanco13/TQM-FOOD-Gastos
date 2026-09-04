import React, { useMemo, useState } from "react";
import { Check, Ban } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { saveGastos } from "../lib/db.js";
import { COLORS, dangerBtn, primaryBtn } from "../theme.js";
import { SectionTitle, EmptyState, Banner } from "./UI.jsx";
import { RecordCard } from "./MyRecords.jsx";

export default function Approvals() {
  const { session, gastos, gastosFileId, gastosModifiedTime, setGastos, setGastosMeta } = useApp();
  const [notas, setNotas] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const pendientes = useMemo(
    () => gastos.filter((g) => g.estado === "pendiente").sort((a, b) => a.creadoEn - b.creadoEn),
    [gastos]
  );

  async function resolver(id, estado) {
    setBusyId(id);
    setError("");
    try {
      const { data, fileId, modifiedTime } = await saveGastos(gastos, gastosFileId, gastosModifiedTime, (list) =>
        list.map((g) => (g.id === id ? { ...g, estado, revisadoPor: session.username, notaRevision: notas[id] || "" } : g))
      );
      setGastos(data);
      setGastosMeta(fileId, modifiedTime);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SectionTitle>Aprobar ({pendientes.length})</SectionTitle>
      {error && <Banner tone="error">{error}</Banner>}
      {pendientes.length === 0 ? (
        <EmptyState text="No hay gastos ni kilometraje pendientes de revisión." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pendientes.map((g) => (
            <div key={g.id}>
              <RecordCard record={g} showUser />
              <input
                placeholder="Nota (opcional)"
                value={notas[g.id] || ""}
                onChange={(e) => setNotas((n) => ({ ...n, [g.id]: e.target.value }))}
                style={{
                  width: "100%", marginTop: 6, padding: "7px 9px", borderRadius: 8,
                  border: `1px solid ${COLORS.line}`, fontSize: 12.5, background: "#fff",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  disabled={busyId === g.id}
                  onClick={() => resolver(g.id, "aprobado")}
                  style={{ ...primaryBtn, background: COLORS.green, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: busyId === g.id ? 0.6 : 1 }}
                >
                  <Check size={15} /> Aprobar
                </button>
                <button
                  disabled={busyId === g.id}
                  onClick={() => resolver(g.id, "rechazado")}
                  style={{ ...dangerBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: busyId === g.id ? 0.6 : 1 }}
                >
                  <Ban size={15} /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
