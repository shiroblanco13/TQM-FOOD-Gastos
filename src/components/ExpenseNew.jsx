import React, { useMemo, useRef, useState } from "react";
import { Camera, FileText, ScanText, X, Loader2, History, MapPin, Route } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { saveGastos, uploadAdjunto } from "../lib/db.js";
import { recognizeTicket, extractImporte, extractFecha } from "../lib/ocr.js";
import { hasMapsKey, computeDistanceKm } from "../lib/googleMaps.js";
import { CATEGORIAS_GASTO, COLORS, FONT_DISPLAY, fmtMoney, inputStyle, labelStyle, primaryBtn, secondaryBtn } from "../theme.js";
import { SectionTitle, Banner, Card } from "./UI.jsx";
import AddressAutocomplete from "./AddressAutocomplete.jsx";

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseNew() {
  const { session, gastos, gastosFileId, gastosModifiedTime, setGastos, setGastosMeta, config } = useApp();
  const [tipo, setTipo] = useState("gasto"); // gasto | kilometraje
  const fileRef = useRef(null);

  const [gastoForm, setGastoForm] = useState({ fecha: today(), categoria: CATEGORIAS_GASTO[0], importe: "", descripcion: "" });
  const [kmForm, setKmForm] = useState({ fecha: today(), origen: "", destino: "", km: "", motivo: "" });

  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text }

  const tarifaKm = config?.tarifaKm ?? 0.26;
  const importeKm = (Number(kmForm.km) || 0) * tarifaKm;

  const misTrayectosKm = useMemo(
    () => gastos.filter((g) => g.username === session.username && g.tipo === "kilometraje").sort((a, b) => b.creadoEn - a.creadoEn),
    [gastos, session]
  );
  const origenHabitual = misTrayectosKm[0]?.origen || "";
  const trayectosFrecuentes = useMemo(() => {
    const vistos = new Map();
    for (const g of misTrayectosKm) {
      const clave = `${g.origen}|${g.destino}`.toLowerCase();
      if (!vistos.has(clave)) vistos.set(clave, g);
    }
    return [...vistos.values()].slice(0, 5);
  }, [misTrayectosKm]);

  function usarOrigenHabitual() {
    setKmForm((f) => ({ ...f, origen: origenHabitual }));
  }

  function usarTrayecto(t) {
    setKmForm((f) => ({ ...f, origen: t.origen, destino: t.destino, km: String(t.km) }));
  }

  const [calculandoKm, setCalculandoKm] = useState(false);
  const [errorKm, setErrorKm] = useState("");

  async function calcularKmAutomaticamente() {
    if (!kmForm.origen.trim() || !kmForm.destino.trim()) {
      setErrorKm("Rellena origen y destino primero.");
      return;
    }
    setCalculandoKm(true);
    setErrorKm("");
    try {
      const km = await computeDistanceKm(kmForm.origen.trim(), kmForm.destino.trim());
      setKmForm((f) => ({ ...f, km: String(km) }));
    } catch (e) {
      setErrorKm(e.message);
    } finally {
      setCalculandoKm(false);
    }
  }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFilePreview(f.type === "application/pdf" ? null : URL.createObjectURL(f));
    setMsg(null);
    // Al adjuntar un ticket nuevo, se borra el importe anterior para que nunca
    // se pueda confundir con el de un ticket distinto si el OCR no detecta nada.
    setGastoForm((f2) => ({ ...f2, importe: "" }));
  }

  function clearFile() {
    setFile(null);
    setFilePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function runOcr() {
    if (!file || file.type === "application/pdf") return;
    setOcrBusy(true);
    setOcrProgress(0);
    setMsg(null);
    try {
      const text = await recognizeTicket(file, setOcrProgress);
      const importe = extractImporte(text);
      const fecha = extractFecha(text);
      setGastoForm((f) => ({
        ...f,
        importe: importe ? String(importe.toFixed(2)) : f.importe,
        fecha: fecha || f.fecha,
      }));
      setMsg({ tone: importe || fecha ? "success" : "warn", text: importe || fecha
        ? "Datos extraídos del ticket. Revísalos antes de enviar."
        : "No se ha podido reconocer el importe o la fecha automáticamente. Rellénalos a mano." });
    } catch (e) {
      setMsg({ tone: "error", text: "No se pudo leer el ticket. Rellena los datos manualmente." });
    } finally {
      setOcrBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (tipo === "gasto" && (!gastoForm.importe || Number(gastoForm.importe) <= 0)) {
      setMsg({ tone: "error", text: "Indica un importe válido." });
      return;
    }
    if (tipo === "kilometraje" && (!kmForm.km || Number(kmForm.km) <= 0)) {
      setMsg({ tone: "error", text: "Indica los kilómetros recorridos." });
      return;
    }

    setSubmitBusy(true);
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const fechaRegistro = tipo === "gasto" ? gastoForm.fecha : kmForm.fecha;
      let adjunto = null;
      if (file) adjunto = await uploadAdjunto(file, { registroId: id, username: session.username, fecha: fechaRegistro });

      const base = {
        id, username: session.username, tipo, estado: "pendiente",
        creadoEn: Date.now(), revisadoPor: null, notaRevision: "", adjunto,
      };

      const registro = tipo === "gasto"
        ? { ...base, fecha: gastoForm.fecha, categoria: gastoForm.categoria, importe: Number(gastoForm.importe), descripcion: gastoForm.descripcion.trim() }
        : {
          ...base, fecha: kmForm.fecha, origen: kmForm.origen.trim(), destino: kmForm.destino.trim(),
          km: Number(kmForm.km), tarifaKm, importe: Number((Number(kmForm.km) * tarifaKm).toFixed(2)),
          descripcion: kmForm.motivo.trim(),
        };

      const { data, fileId, modifiedTime } = await saveGastos(gastos, gastosFileId, gastosModifiedTime, (list) => [...list, registro]);
      setGastos(data);
      setGastosMeta(fileId, modifiedTime);

      setGastoForm({ fecha: today(), categoria: CATEGORIAS_GASTO[0], importe: "", descripcion: "" });
      setKmForm({ fecha: today(), origen: "", destino: "", km: "", motivo: "" });
      clearFile();
      setMsg({ tone: "success", text: `${tipo === "gasto" ? "Gasto" : "Kilometraje"} enviado. Queda pendiente de aprobación.` });
    } catch (e) {
      setMsg({ tone: "error", text: e.message });
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <div>
      <SectionTitle>Nuevo</SectionTitle>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TypeToggle active={tipo === "gasto"} onClick={() => setTipo("gasto")} label="Gasto" />
        <TypeToggle active={tipo === "kilometraje"} onClick={() => setTipo("kilometraje")} label="Kilometraje" />
      </div>

      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

      <form onSubmit={handleSubmit}>
        {tipo === "gasto" ? (
          <>
            <label style={labelStyle}>Foto o PDF del ticket</label>
            <AttachmentPicker
              file={file} filePreview={filePreview} fileRef={fileRef}
              onPick={handleFile} onClear={clearFile}
              onOcr={runOcr} ocrBusy={ocrBusy} ocrProgress={ocrProgress}
            />

            <label style={labelStyle}>Fecha</label>
            <input style={inputStyle} type="date" value={gastoForm.fecha} onChange={(e) => setGastoForm((f) => ({ ...f, fecha: e.target.value }))} />

            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={gastoForm.categoria} onChange={(e) => setGastoForm((f) => ({ ...f, categoria: e.target.value }))}>
              {CATEGORIAS_GASTO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={labelStyle}>Importe (€)</label>
            <input style={inputStyle} type="number" step="0.01" min="0" value={gastoForm.importe}
              onChange={(e) => setGastoForm((f) => ({ ...f, importe: e.target.value }))} placeholder="0.00" />

            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={gastoForm.descripcion}
              onChange={(e) => setGastoForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional" />
          </>
        ) : (
          <>
            <label style={labelStyle}>Fecha</label>
            <input style={inputStyle} type="date" value={kmForm.fecha} onChange={(e) => setKmForm((f) => ({ ...f, fecha: e.target.value }))} />

            {trayectosFrecuentes.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}><History size={11} style={{ verticalAlign: -1 }} /> Trayectos recientes</label>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                  {trayectosFrecuentes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => usarTrayecto(t)}
                      style={{
                        flexShrink: 0, border: `1px solid ${COLORS.line}`, background: "#fff", borderRadius: 8,
                        padding: "7px 10px", fontSize: 11.5, color: COLORS.ink, cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{t.origen || "?"} → {t.destino || "?"}</div>
                      <div style={{ color: COLORS.inkSoft }}>{t.km} km</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={labelStyle}>Origen</label>
                  {origenHabitual && origenHabitual !== kmForm.origen && (
                    <button type="button" onClick={usarOrigenHabitual} style={{
                      background: "none", border: "none", color: COLORS.ink, fontSize: 10.5, fontWeight: 600,
                      cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 2,
                    }}>
                      <MapPin size={10} /> El habitual
                    </button>
                  )}
                </div>
                <AddressAutocomplete value={kmForm.origen} onChange={(v) => setKmForm((f) => ({ ...f, origen: v }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Destino</label>
                <AddressAutocomplete value={kmForm.destino} onChange={(v) => setKmForm((f) => ({ ...f, destino: v }))} />
              </div>
            </div>

            {hasMapsKey() && (
              <div style={{ marginTop: 8, marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={calcularKmAutomaticamente}
                  disabled={calculandoKm}
                  style={{ ...secondaryBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: calculandoKm ? 0.6 : 1 }}
                >
                  {calculandoKm ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Route size={14} />}
                  {calculandoKm ? "Calculando…" : "Calcular km automáticamente"}
                </button>
                {errorKm && <div style={{ fontSize: 11.5, color: COLORS.red, marginTop: 5 }}>{errorKm}</div>}
              </div>
            )}

            <label style={labelStyle}>Kilómetros</label>
            <input style={inputStyle} type="number" step="0.1" min="0" value={kmForm.km}
              onChange={(e) => setKmForm((f) => ({ ...f, km: e.target.value }))} placeholder="0" />

            <Card style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12.5, color: COLORS.inkSoft }}>{kmForm.km || 0} km × {fmtMoney(tarifaKm)}/km</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: COLORS.navy }}>{fmtMoney(importeKm)}</span>
            </Card>

            <label style={labelStyle}>Motivo</label>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={kmForm.motivo}
              onChange={(e) => setKmForm((f) => ({ ...f, motivo: e.target.value }))} placeholder="Opcional" />

            <label style={labelStyle}>Justificante (opcional)</label>
            <AttachmentPicker file={file} filePreview={filePreview} fileRef={fileRef} onPick={handleFile} onClear={clearFile} />
          </>
        )}

        <button type="submit" disabled={submitBusy} style={{ ...primaryBtn, opacity: submitBusy ? 0.6 : 1, marginTop: 4 }}>
          {submitBusy ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}

function TypeToggle({ active, onClick, label }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: "10px 0", borderRadius: 11, border: `1.5px solid ${active ? COLORS.navy : COLORS.line}`,
      background: active ? COLORS.navy : "#fff", color: active ? "#fff" : COLORS.inkSoft,
      fontWeight: 700, fontSize: 13, cursor: "pointer",
    }}>
      {label}
    </button>
  );
}

function AttachmentPicker({ file, filePreview, fileRef, onPick, onClear, onOcr, ocrBusy, ocrProgress }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {!file ? (
        <label style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
          border: `1px dashed ${COLORS.line}`, borderRadius: 10, padding: "22px 10px", cursor: "pointer", color: COLORS.inkSoft,
        }}>
          <Camera size={22} />
          <span style={{ fontSize: 12.5 }}>Hacer foto o elegir imagen / PDF</span>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" onChange={onPick} style={{ display: "none" }} />
        </label>
      ) : (
        <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: COLORS.bg }}>
            {filePreview ? (
              <img src={filePreview} alt="ticket" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
            ) : (
              <FileText size={22} color={COLORS.inkSoft} />
            )}
            <span style={{ fontSize: 12.5, color: COLORS.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </span>
            <button type="button" onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}>
              <X size={16} />
            </button>
          </div>
          {onOcr && filePreview && (
            <button type="button" onClick={onOcr} disabled={ocrBusy} style={{
              width: "100%", border: "none", borderTop: `1px solid ${COLORS.line}`, background: "#fff",
              padding: "9px 0", fontSize: 12.5, fontWeight: 600, color: COLORS.ink, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {ocrBusy ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Leyendo ticket… {Math.round(ocrProgress * 100)}%
                </>
              ) : (
                <>
                  <ScanText size={14} /> Extraer importe y fecha (OCR)
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
