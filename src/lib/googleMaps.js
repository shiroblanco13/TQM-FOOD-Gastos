// Integración con Google Maps Platform, opcional: si no hay clave configurada,
// todo esto se queda inactivo en silencio y los campos de origen/destino
// funcionan como texto libre normal (ver AddressAutocomplete.jsx).
//
// APIs usadas (las vigentes en 2026, no las antiguas ya en modo "legacy"):
// - Places API (New) → sugerencias de direcciones mientras se escribe.
// - Routes API → distancia en coche entre dos direcciones (computeRoutes).
//
// A diferencia de Google Drive, aquí la clave SÍ puede ir en el navegador:
// Google recomienda restringir las claves de Maps por dominio (HTTP referrer)
// en vez de ocultarlas del todo, así que no hace falta pasar por una función
// de Netlify para estas llamadas.

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

let loadingPromise = null;

export function hasMapsKey() {
  return Boolean(MAPS_KEY);
}

function loadPlacesLibrary() {
  if (window.google?.maps?.places?.AutocompleteSuggestion) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&v=weekly&loading=async&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps."));
    document.head.appendChild(script);
  });
  return loadingPromise;
}

/** Crea un nuevo token de sesión: agrupa las pulsaciones de un mismo intento de búsqueda en una sola sesión facturable. */
export async function newSessionToken() {
  if (!hasMapsKey()) return null;
  await loadPlacesLibrary();
  return new window.google.maps.places.AutocompleteSessionToken();
}

/** Devuelve hasta 5 sugerencias de direcciones para el texto dado. */
export async function fetchAddressSuggestions(input, sessionToken) {
  if (!hasMapsKey() || !input || input.trim().length < 3) return [];
  await loadPlacesLibrary();
  const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken,
    includedRegionCodes: ["es"],
  });
  return (suggestions || [])
    .filter((s) => s.placePrediction)
    .slice(0, 5)
    .map((s) => ({ id: s.placePrediction.placeId, text: s.placePrediction.text.text }));
}

/** Calcula la distancia en coche (km, redondeado a 1 decimal) entre dos direcciones de texto libre. */
export async function computeDistanceKm(origenTexto, destinoTexto) {
  if (!hasMapsKey()) throw new Error("El cálculo automático de distancia no está configurado.");
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": MAPS_KEY,
      "X-Goog-FieldMask": "routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: { address: origenTexto },
      destination: { address: destinoTexto },
      travelMode: "DRIVE",
      units: "METRIC",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo calcular la distancia (${res.status}): ${text.slice(0, 150)}`);
  }
  const data = await res.json();
  const meters = data.routes?.[0]?.distanceMeters;
  if (!meters) throw new Error("Google no encontró una ruta en coche entre esas dos direcciones.");
  return Math.round((meters / 1000) * 10) / 10;
}
