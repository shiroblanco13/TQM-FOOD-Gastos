import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileSpreadsheet, FileText, CalendarRange } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { uploadExport, uploadInformeMensual } from "../lib/db.js";
import { COLORS, FONT_DISPLAY, MESES, fmtMoney, inputStyle, labelStyle, primaryBtn } from "../theme.js";
import { SectionTitle, Banner, Card } from "./UI.jsx";

export default function ExportPanel() {
  const { gastos, usuarios } = useApp();
  const [estado, setEstado] = useState("aprobado");
  const [tipo, setTipo] = useState("todos");
  const [usuario, setUsuario] = useState("todos");
  const [busy, setBusy] = useState(null); // "excel" | "pdf" | null
  const [msg, setMsg] = useState(null);

  const filtrados = useMemo(() => {
    return gastos
      .filter((g) => estado === "todos" || g.estado === estado)
      .filter((g) => tipo === "todos" || g.tipo === tipo)
      .filter((g) => usuario === "todos" || g.username === usuario)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [gastos, estado, tipo, usuario]);

  const total = filtrados.reduce((sum, g) => sum + (Number(g.importe) || 0), 0);
  const nombreArchivo = () => `gastos_${estado}_${new Date().toISOString().slice(0, 10)}`;

  function rowsForTable() {
    return filtrados.map((g) => ({
      Empleado: g.username,
      Tipo: g.tipo === "kilometraje" ? "Kilometraje" : "Gasto",
      Fecha: g.fecha,
      Detalle: g.tipo === "kilometraje" ? `${g.origen || ""} → ${g.destino || ""} (${g.km} km)` : g.categoria,
      Importe: g.importe,
      Descripcion: g.descripcion || "",
      Estado: g.estado,
      "Revisado por": g.revisadoPor || "",
      Nota: g.notaRevision || "",
    }));
  }

  async function exportExcel() {
    setBusy("excel");
    setMsg(null);
    try {
      const rows = rowsForTable();
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gastos");

      const filename = `${nombreArchivo()}.xlsx`;
      XLSX.writeFile(wb, filename);

      const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const path = await uploadExport(bytes, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      setMsg({ tone: "success", text: `Excel descargado y guardado en Google Drive (${path}).` });
    } catch (e) {
      setMsg({ tone: "error", text: "El archivo se descargó, pero no se pudo guardar la copia en Google Drive: " + e.message });
    } finally {
      setBusy(null);
    }
  }

  async function exportPdfFile() {
    setBusy("pdf");
    setMsg(null);
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text(`Informe de gastos (${estado})`, 14, 16);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, 14, 22);

      autoTable(doc, {
        startY: 27,
        head: [["Empleado", "Tipo", "Fecha", "Detalle", "Importe", "Estado", "Revisado por"]],
        body: filtrados.map((g) => [
          g.username,
          g.tipo === "kilometraje" ? "Kilometraje" : "Gasto",
          g.fecha,
          g.tipo === "kilometraje" ? `${g.origen || ""} → ${g.destino || ""} (${g.km} km)` : g.categoria,
          fmtMoney(g.importe),
          g.estado,
          g.revisadoPor || "",
        ]),
        foot: [["", "", "", "TOTAL", fmtMoney(total), "", ""]],
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [28, 37, 54] },
        footStyles: { fillColor: [236, 238, 242], textColor: [28, 37, 54], fontStyle: "bold" },
      });

      const filename = `${nombreArchivo()}.pdf`;
      doc.save(filename);

      const bytes = doc.output("arraybuffer");
      const path = await uploadExport(bytes, filename, "application/pdf");
      setMsg({ tone: "success", text: `PDF descargado y guardado en Google Drive (${path}).` });
    } catch (e) {
      setMsg({ tone: "error", text: "El archivo se descargó, pero no se pudo guardar la copia en Google Drive: " + e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <SectionTitle>Exportar</SectionTitle>

      <label style={labelStyle}>Estado</label>
      <select style={inputStyle} value={estado} onChange={(e) => setEstado(e.target.value)}>
        <option value="aprobado">Aprobados</option>
        <option value="pendiente">Pendientes</option>
        <option value="rechazado">Rechazados</option>
        <option value="todos">Todos</option>
      </select>

      <label style={labelStyle}>Tipo</label>
      <select style={inputStyle} value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="todos">Gastos y kilometraje</option>
        <option value="gasto">Solo gastos</option>
        <option value="kilometraje">Solo kilometraje</option>
      </select>

      <label style={labelStyle}>Empleado</label>
      <select style={inputStyle} value={usuario} onChange={(e) => setUsuario(e.target.value)}>
        <option value="todos">Todos</option>
        {usuarios.map((u) => <option key={u.username} value={u.username}>{u.nombre || u.username}</option>)}
      </select>

      <Card style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12.5, color: COLORS.inkSoft }}>{filtrados.length} registro(s)</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }}>{fmtMoney(total)}</span>
      </Card>

      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={exportExcel} disabled={busy !== null} style={{ ...primaryBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: busy ? 0.6 : 1 }}>
          <FileSpreadsheet size={15} /> {busy === "excel" ? "Generando…" : "Excel"}
        </button>
        <button onClick={exportPdfFile} disabled={busy !== null} style={{ ...primaryBtn, background: COLORS.ink, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: busy ? 0.6 : 1 }}>
          <FileText size={15} /> {busy === "pdf" ? "Generando…" : "PDF"}
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
        <Download size={12} /> Cada exportación se descarga en el dispositivo y además se guarda una copia en la carpeta "exports" de Google Drive.
      </div>

      <InformeMensual gastos={gastos} usuarios={usuarios} />
    </div>
  );
}

function InformeMensual({ gastos, usuarios }) {
  const now = new Date();
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [mesIndex, setMesIndex] = useState(now.getMonth());
  const [estado, setEstado] = useState("aprobado");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const nombresPorUsername = useMemo(() => {
    const map = {};
    usuarios.forEach((u) => { map[u.username] = u.nombre || u.username; });
    return map;
  }, [usuarios]);

  const delMes = useMemo(() => {
    const prefijo = `${anio}-${String(mesIndex + 1).padStart(2, "0")}`;
    return gastos
      .filter((g) => g.fecha?.startsWith(prefijo))
      .filter((g) => estado === "todos" || g.estado === estado)
      .sort((a, b) => (a.username === b.username ? a.fecha.localeCompare(b.fecha) : a.username.localeCompare(b.username)));
  }, [gastos, anio, mesIndex, estado]);

  const totalGeneral = delMes.reduce((sum, g) => sum + (Number(g.importe) || 0), 0);

  async function generarInforme() {
    setBusy(true);
    setMsg(null);
    try {
      const mesNombre = MESES[mesIndex];
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text(`Informe mensual de gastos — ${mesNombre} ${anio}`, 14, 16);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generado: ${new Date().toLocaleString("es-ES")} · Estado: ${estado}`, 14, 22);

      const body = [];
      let usernameActual = null;
      let subtotal = 0;

      const cerrarSubtotal = () => {
        if (usernameActual !== null) {
          body.push(["", "", "", `Subtotal ${nombresPorUsername[usernameActual] || usernameActual}`, fmtMoney(subtotal), ""]);
        }
      };

      for (const g of delMes) {
        if (g.username !== usernameActual) {
          cerrarSubtotal();
          usernameActual = g.username;
          subtotal = 0;
        }
        subtotal += Number(g.importe) || 0;
        body.push([
          nombresPorUsername[g.username] || g.username,
          g.tipo === "kilometraje" ? "Kilometraje" : "Gasto",
          g.fecha,
          g.tipo === "kilometraje" ? `${g.origen || ""} → ${g.destino || ""} (${g.km} km)` : g.categoria,
          fmtMoney(g.importe),
          g.estado,
        ]);
      }
      cerrarSubtotal();

      autoTable(doc, {
        startY: 27,
        head: [["Empleado", "Tipo", "Fecha", "Detalle", "Importe", "Estado"]],
        body,
        foot: [["", "", "", "TOTAL DEL MES", fmtMoney(totalGeneral), ""]],
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [28, 37, 54] },
        footStyles: { fillColor: [236, 238, 242], textColor: [28, 37, 54], fontStyle: "bold" },
        didParseCell: (data) => {
          const cell = data.row.raw?.[3];
          if (typeof cell === "string" && cell.startsWith("Subtotal")) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [236, 238, 242];
          }
        },
      });

      const filename = `informe_${mesNombre}_${anio}.pdf`;
      doc.save(filename);

      const bytes = doc.output("arraybuffer");
      const path = await uploadInformeMensual(bytes, filename, anio, mesNombre);
      setMsg({ tone: "success", text: `Informe descargado y guardado en Google Drive, dentro de la carpeta ${anio}/${mesNombre} (${path}).` });
    } catch (e) {
      setMsg({ tone: "error", text: "El informe se descargó, pero no se pudo guardar la copia en Google Drive: " + e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 24, borderTop: `1px solid ${COLORS.line}`, paddingTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <CalendarRange size={17} color={COLORS.ink} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, color: COLORS.ink }}>Informe mensual</span>
      </div>
      <p style={{ fontSize: 12.5, color: COLORS.inkSoft, marginTop: 0, lineHeight: 1.5 }}>
        Genera un PDF con el total de gastos y kilometraje de un mes, desglosado por
        persona, y lo guarda en la carpeta de ese mes en Google Drive.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Mes</label>
          <select style={inputStyle} value={mesIndex} onChange={(e) => setMesIndex(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={m} value={i}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ width: 100 }}>
          <label style={labelStyle}>Año</label>
          <input style={inputStyle} type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
        </div>
      </div>

      <label style={labelStyle}>Estado incluido</label>
      <select style={inputStyle} value={estado} onChange={(e) => setEstado(e.target.value)}>
        <option value="aprobado">Solo aprobados</option>
        <option value="todos">Todos (aprobados, pendientes y rechazados)</option>
      </select>

      <Card style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12.5, color: COLORS.inkSoft }}>{delMes.length} registro(s) ese mes</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }}>{fmtMoney(totalGeneral)}</span>
      </Card>

      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

      <button onClick={generarInforme} disabled={busy || delMes.length === 0} style={{ ...primaryBtn, background: COLORS.amber, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: busy || delMes.length === 0 ? 0.6 : 1 }}>
        <FileText size={15} /> {busy ? "Generando…" : "Generar informe mensual (PDF)"}
      </button>
      {delMes.length === 0 && (
        <div style={{ fontSize: 11.5, color: COLORS.inkSoft, marginTop: 6, textAlign: "center" }}>
          No hay registros para ese mes con el filtro seleccionado.
        </div>
      )}
    </div>
  );
}
