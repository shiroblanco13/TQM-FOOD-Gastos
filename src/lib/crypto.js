// Hash de contraseñas con PBKDF2-SHA256 usando Web Crypto (sin dependencias externas).
// No existe backend: el hash se calcula y se verifica en el propio navegador contra
// el usuarios.json guardado en Google Drive. Es mucho más seguro que guardar contraseñas
// en claro, pero no sustituye a una autenticación real de servidor — ver README.

const ITERATIONS = 100_000;

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes.buffer;
}

export function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

/** Genera una contraseña temporal legible (evita caracteres ambiguos). */
export function generateTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => alphabet[n % alphabet.length]).join("");
}

async function pbkdf2(password, saltHex, iterations = ITERATIONS) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBuf(saltHex), iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return bufToHex(bits);
}

export async function hashPassword(password) {
  const salt = randomHex(16);
  const hash = await pbkdf2(password, salt);
  return { salt, hash, iterations: ITERATIONS };
}

export async function verifyPassword(password, salt, hash, iterations = ITERATIONS) {
  if (!salt || !hash) return false;
  const computed = await pbkdf2(password, salt, iterations);
  if (computed.length !== hash.length) return false;
  // Comparación en tiempo aproximadamente constante
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}
