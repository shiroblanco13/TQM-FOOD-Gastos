import { downloadJson, uploadJson, uploadBinary, getViewUrl } from "./googleDriveClient.js";
import { buildSeedUsers } from "./seed.js";

const NAMES = {
  usuarios: "usuarios.json",
  gastos: "gastos.json",
  config: "config.json",
};

const DEFAULT_CONFIG = { tarifaKm: 0.26, version: 1 };

/**
 * Lee usuarios.json; si todavía no existe en Drive (primer arranque), lo crea
 * junto con gastos.json y config.json, con los 5 usuarios iniciales y
 * contraseñas temporales aleatorias, devueltas UNA sola vez para mostrarlas
 * al superadministrador que hace la puesta en marcha.
 */
export async function loadOrBootstrapUsuarios() {
  const { data, fileId, modifiedTime } = await downloadJson(NAMES.usuarios, null);
  if (data) return { usuarios: data, fileId, modifiedTime, bootstrapPasswords: null };

  const { usuarios, plainPasswords } = await buildSeedUsers();
  const result = await uploadJson(NAMES.usuarios, usuarios, null, null);

  const gastos = await downloadJson(NAMES.gastos, null);
  if (!gastos.data) await uploadJson(NAMES.gastos, [], null, null);
  const config = await downloadJson(NAMES.config, null);
  if (!config.data) await uploadJson(NAMES.config, DEFAULT_CONFIG, null, null);

  return { usuarios, fileId: result.id, modifiedTime: result.modifiedTime, bootstrapPasswords: plainPasswords };
}

export async function loadUsuarios() {
  const { data, fileId, modifiedTime } = await downloadJson(NAMES.usuarios, []);
  return { usuarios: data || [], fileId, modifiedTime };
}

export async function loadGastos() {
  const { data, fileId, modifiedTime } = await downloadJson(NAMES.gastos, []);
  return { gastos: data || [], fileId, modifiedTime };
}

export async function loadConfig() {
  const { data, fileId, modifiedTime } = await downloadJson(NAMES.config, DEFAULT_CONFIG);
  return { config: data || DEFAULT_CONFIG, fileId, modifiedTime };
}

/**
 * Guarda con reintento automático si hay conflicto de escritura concurrente:
 * vuelve a descargar, aplica `mutateFn` sobre los datos frescos y reintenta.
 */
async function saveWithRetry(name, currentData, currentFileId, currentModifiedTime, mutateFn, attempts = 3) {
  let data = currentData;
  let fileId = currentFileId;
  let modifiedTime = currentModifiedTime;
  for (let i = 0; i < attempts; i++) {
    const next = mutateFn(data);
    try {
      const result = await uploadJson(name, next, fileId, modifiedTime);
      return { data: next, fileId: result.id, modifiedTime: result.modifiedTime };
    } catch (e) {
      if (e.code === "conflict" && i < attempts - 1) {
        const fresh = await downloadJson(name, next);
        data = fresh.data;
        fileId = fresh.fileId;
        modifiedTime = fresh.modifiedTime;
        continue;
      }
      throw e;
    }
  }
}

export function saveUsuarios(usuarios, fileId, modifiedTime, mutateFn) {
  return saveWithRetry(NAMES.usuarios, usuarios, fileId, modifiedTime, mutateFn);
}

export function saveGastos(gastos, fileId, modifiedTime, mutateFn) {
  return saveWithRetry(NAMES.gastos, gastos, fileId, modifiedTime, mutateFn);
}

export function saveConfig(config, fileId, modifiedTime, mutateFn) {
  return saveWithRetry(NAMES.config, config, fileId, modifiedTime, mutateFn);
}

// ---------- Archivos adjuntos ----------

function extFor(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".png")) return "png";
  return "jpg";
}

/** Sube un adjunto (foto de ticket o PDF de factura) y devuelve su metadata para guardar en el registro. */
export async function uploadAdjunto(file, { registroId }) {
  const ext = extFor(file);
  const subfolder = ext === "pdf" ? "facturas" : "tickets";
  const filename = `${registroId}.${ext}`;
  const bytes = await file.arrayBuffer();
  const result = await uploadBinary(subfolder, filename, bytes, file.type || "application/octet-stream");
  return { fileId: result.id, tipo: ext === "pdf" ? "pdf" : "imagen", nombreOriginal: file.name || "" };
}

export async function uploadExport(bytes, filename, contentType) {
  const result = await uploadBinary("exports", filename, bytes, contentType);
  return result.name || filename;
}

export { getViewUrl };
export { DEFAULT_CONFIG };
