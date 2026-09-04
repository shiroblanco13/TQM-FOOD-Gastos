// OCR 100% en el navegador con tesseract.js (WebAssembly). La primera vez que
// se usa descarga el paquete de idioma español (unos pocos MB) desde la CDN
// pública de tesseract.js, así que requiere conexión a internet la primera vez.

let workerPromise = null;

async function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("spa", 1, {
        logger: (m) => {
          if (onProgress && m.status === "recognizing text") onProgress(m.progress);
        },
      });
      return worker;
    })();
  }
  return workerPromise;
}

/** Ejecuta OCR sobre una imagen (File, Blob o dataURL) y devuelve el texto reconocido. */
export async function recognizeTicket(imageSource, onProgress) {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(imageSource);
  return data.text || "";
}

/** Busca el importe más probable (línea con TOTAL, o el mayor importe con decimales del texto). */
export function extractImporte(text) {
  if (!text) return null;
  const moneyRe = /(\d{1,3}(?:[.\s]\d{3})*[.,]\d{2})\s*(?:€|EUR)?/g;
  const lines = text.split(/\r?\n/);

  // 1) Prioridad: línea que contenga TOTAL (pero no "subtotal" como única pista si hay otra mejor)
  const totalLine = lines.find((l) => /\btotal\b/i.test(l) && !/subtotal/i.test(l));
  if (totalLine) {
    const matches = [...totalLine.matchAll(moneyRe)];
    if (matches.length) return parseMoney(matches[matches.length - 1][1]);
  }

  // 2) Si no, el importe más alto de todo el ticket (suele ser el total)
  const all = [...text.matchAll(moneyRe)].map((m) => parseMoney(m[1])).filter((n) => n > 0);
  if (!all.length) return null;
  return Math.max(...all);
}

function parseMoney(raw) {
  const normalized = raw.replace(/[.\s](?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Busca una fecha dd/mm/yyyy, dd-mm-yyyy o dd.mm.yyyy y la normaliza a yyyy-mm-dd. */
export function extractFecha(text) {
  if (!text) return null;
  const dateRe = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/;
  const m = text.match(dateRe);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = `20${y}`;
  d = d.padStart(2, "0");
  mo = mo.padStart(2, "0");
  const iso = `${y}-${mo}-${d}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}
