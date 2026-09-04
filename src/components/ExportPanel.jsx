import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { uploadExport } from "../lib/db.js";
import { COLORS, fmtMoney, inputStyle, labelStyle, primaryBtn } from "../theme.js";
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
    </div>
  );
}
