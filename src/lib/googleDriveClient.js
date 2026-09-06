// Cliente ligero de Google Drive (solo fetch, sin el SDK oficial).
//
// Arquitectura (distinta de Dropbox en un punto importante):
// - VITE_GOOGLE_CLIENT_ID es pública y va en el bundle del cliente, igual que antes.
// - A diferencia de Dropbox, Google SIEMPRE exige un client_secret al canjear un
//   "code" o un "refresh_token" por un access_token — incluso con PKCE y para apps
//   sin backend. Por eso aquí ni el paso de conexión inicial ni el uso normal hacen
//   esa llamada directamente desde el navegador: ambos pasan por funciones de
//   Netlify (google-oauth-exchange y google-token) que guardan el client_secret
//   del lado servidor y nunca lo exponen al cliente.
// - Los archivos se organizan dentro de UNA carpeta raíz en el Drive conectado
//   ("Gastos internos TQM"). Los tres JSON viven en su raíz, junto a una carpeta
//   "exports/" para las exportaciones puntuales. Los adjuntos (fotos de ticket,
//   PDFs de factura) se organizan por AÑO/MES/PERSONA según la fecha del gasto,
//   p.ej. "2026/septiembre/m.marin/ticket_xxxx.jpg", creando esas carpetas sobre
//   la marcha la primera vez que hacen falta.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const DEV_OVERRIDE_KEY = "gdrive_dev_refresh_token";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const REDIRECT_URI = () => window.location.origin + window.location.pathname;

const ROOT_FOLDER_NAME = "Gastos internos TQM";

let cachedToken = { value: null, expiresAt: 0 };
let cachedFolderIds = null; // { root, tickets, facturas, exports }

export function hasClientId() {
  return Boolean(CLIENT_ID);
}

export function getDevOverrideToken() {
  try {
    return window.localStorage.getItem(DEV_OVERRIDE_KEY) || "";
  } catch {
    return "";
  }
}

export function setDevOverrideToken(token) {
  try {
    if (token) window.localStorage.setItem(DEV_OVERRIDE_KEY, token);
    else window.localStorage.removeItem(DEV_OVERRIDE_KEY);
  } catch {
    /* noop */
  }
  cachedToken = { value: null, expiresAt: 0 };
}

// ---------- PKCE OAuth (pantalla de configuración inicial) ----------

function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(str) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
}

export async function startGoogleOAuth() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const challenge = base64url(await sha256(verifier));
  window.sessionStorage.setItem("gdrive_pkce_verifier", verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent", // fuerza a que Google emita SIEMPRE un refresh_token nuevo
    redirect_uri: REDIRECT_URI(),
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Si la URL actual trae ?code=... de vuelta de Google, lo canjea por tokens (vía función de Netlify). */
export async function completeGoogleOAuthIfPresent() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (!code) return null;
  const verifier = window.sessionStorage.getItem("gdrive_pkce_verifier");
  url.searchParams.delete("code");
  url.searchParams.delete("scope");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());
  if (!verifier) return null;

  const res = await fetch("/.netlify/functions/google-oauth-exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI() }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || "No se pudo completar la conexión con Google Drive.");
    err.code = data.code;
    throw err;
  }
  return data; // { access_token, refresh_token, expires_in }
}

// ---------- Obtención de access token para uso normal de la app ----------

async function fetchTokenFromFunction() {
  const res = await fetch("/.netlify/functions/google-token");
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    const err = new Error(info.error || "No se pudo obtener acceso a Google Drive.");
    err.code = info.code;
    throw err;
  }
  return res.json();
}

async function fetchTokenFromDevOverride(refreshToken) {
  // En desarrollo también hace falta el client_secret (ver cabecera del archivo),
  // así que este modo llama igualmente a la función de Netlify, pasándole el
  // refresh token guardado en este navegador en vez del de la variable de entorno.
  const res = await fetch("/.netlify/functions/google-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new Error(info.error || "El refresh token de desarrollo no es válido.");
  }
  return res.json();
}

export async function getAccessToken() {
  const now = Date.now();
  if (cachedToken.value && cachedToken.expiresAt - 30_000 > now) return cachedToken.value;

  const devToken = getDevOverrideToken();
  const data = devToken ? await fetchTokenFromDevOverride(devToken) : await fetchTokenFromFunction();

  cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in || 3500) * 1000 };
  return cachedToken.value;
}

export class GoogleDriveNotConfiguredError extends Error {}

async function authedFetch(url, options = {}) {
  let token;
  try {
    token = await getAccessToken();
  } catch (e) {
    if (e.code === "not_configured") throw new GoogleDriveNotConfiguredError(e.message);
    throw e;
  }
  const res = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  return res;
}

// ---------- Carpetas (equivalente a las rutas de Dropbox) ----------

async function findChild(name, parentId, isFolder) {
  const mimeClause = isFolder ? " and mimeType='application/vnd.google-apps.folder'" : "";
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false${mimeClause}`;
  const res = await authedFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&spaces=drive`);
  if (!res.ok) throw new Error(`No se pudo buscar "${name}" en Drive (${res.status}).`);
  const data = await res.json();
  return data.files?.[0] || null;
}

async function createFolder(name, parentId) {
  const res = await authedFetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined }),
  });
  if (!res.ok) throw new Error(`No se pudo crear la carpeta "${name}".`);
  return res.json();
}

/** Encuentra (o crea la primera vez) la carpeta raíz de la app y la carpeta "exports". Cachea los IDs en memoria durante la sesión. */
export async function ensureAppFolders() {
  if (cachedFolderIds) return cachedFolderIds;

  let root = await findChild(ROOT_FOLDER_NAME, "root", true);
  if (!root) root = await createFolder(ROOT_FOLDER_NAME, "root");

  let exportsFolder = await findChild("exports", root.id, true);
  if (!exportsFolder) exportsFolder = await createFolder("exports", root.id);

  cachedFolderIds = { root: root.id, exports: exportsFolder.id };
  return cachedFolderIds;
}

/**
 * Encuentra o crea, nivel a nivel, una carpeta anidada dentro de la carpeta raíz
 * de la app a partir de una lista de nombres, p.ej. ["2026", "septiembre", "m.marin"].
 * Devuelve el ID de la última carpeta de la ruta.
 */
export async function ensureNestedFolder(segments) {
  const { root } = await ensureAppFolders();
  let parentId = root;
  for (const segment of segments) {
    let folder = await findChild(segment, parentId, true);
    if (!folder) folder = await createFolder(segment, parentId);
    parentId = folder.id;
  }
  return parentId;
}

// ---------- Lectura / escritura de JSON ----------

/** Descarga un JSON por nombre dentro de la carpeta raíz. Devuelve { data, fileId, modifiedTime } o fallback si no existe. */
export async function downloadJson(filename, fallback) {
  const { root } = await ensureAppFolders();
  const file = await findChild(filename, root, false);
  if (!file) return { data: fallback, fileId: null, modifiedTime: null };

  const res = await authedFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  if (!res.ok) throw new Error(`No se pudo leer ${filename} (${res.status}).`);
  const data = await res.json();
  return { data, fileId: file.id, modifiedTime: file.modifiedTime };
}

/**
 * Sube JSON a Drive (crea el archivo si no existe, o actualiza su contenido si ya
 * existe). Si se pasa `expectedModifiedTime`, primero comprueba que nadie más lo
 * haya modificado mientras tanto; si ha cambiado, lanza un error code="conflict"
 * en vez de pisar los datos silenciosamente.
 */
export async function uploadJson(filename, data, fileId, expectedModifiedTime) {
  const { root } = await ensureAppFolders();

  if (fileId && expectedModifiedTime) {
    const check = await authedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`);
    if (check.ok) {
      const current = await check.json();
      if (current.modifiedTime !== expectedModifiedTime) {
        const err = new Error("Otra persona ha modificado estos datos a la vez. Recarga e inténtalo de nuevo.");
        err.code = "conflict";
        throw err;
      }
    }
  }

  const body = JSON.stringify(data, null, 2);
  const metadata = fileId ? {} : { name: filename, parents: [root], mimeType: "application/json" };
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,modifiedTime`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`;

  const boundary = "gtqm" + Math.random().toString(36).slice(2);
  const multipartBody =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;

  const res = await authedFetch(url, {
    method: fileId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipartBody,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo guardar ${filename}: ${text.slice(0, 200)}`);
  }
  return res.json(); // { id, modifiedTime }
}

// ---------- Archivos adjuntos (imágenes / PDF) ----------

/** Sube un archivo binario a una ruta de carpetas dentro de la app, p.ej. ["2026","septiembre","m.marin"] o ["exports"]. Las crea si no existen. */
export async function uploadBinary(pathSegments, filename, bytesOrBlob, contentType) {
  const parentId = await ensureNestedFolder(pathSegments);
  const metadata = { name: filename, parents: [parentId] };

  const boundary = "gtqm" + Math.random().toString(36).slice(2);
  const bytes = bytesOrBlob instanceof Blob ? await bytesOrBlob.arrayBuffer() : bytesOrBlob;
  const base64Body = arrayBufferToBase64(bytes);

  const multipartBody =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${contentType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Body}\r\n--${boundary}--`;

  const res = await authedFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipartBody,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo subir el archivo: ${text.slice(0, 200)}`);
  }
  return res.json(); // { id, name }
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Descarga el contenido de un archivo por su fileId y devuelve una object URL para verlo/abrirlo. */
export async function getViewUrl(fileId) {
  const res = await authedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`No se pudo abrir el archivo (${res.status}).`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
