// Uso normal de la app (cada vez que hace falta un access token nuevo).
// Variables de entorno en Netlify (Site settings → Environment variables):
//
//   GOOGLE_CLIENT_ID       (la misma que VITE_GOOGLE_CLIENT_ID)
//   GOOGLE_CLIENT_SECRET   (de Google Cloud Console)
//   GOOGLE_REFRESH_TOKEN   (obtenido una vez desde la pantalla de configuración
//                            inicial dentro de la app, ver google-oauth-exchange.mjs)
//
// GET  → usa el refresh token de las variables de entorno (uso normal en producción).
// POST { refresh_token } → usa ese refresh token en vez del de las variables de
//   entorno (solo para el modo de prueba local desde el propio navegador, ver
//   src/lib/googleDriveClient.js).

export default async function handler(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return jsonResponse(503, {
      error: "Google Drive todavía no está configurado en este despliegue.",
      code: "not_configured",
    });
  }

  let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (request.method === "POST") {
    try {
      const payload = await request.json();
      if (payload?.refresh_token) refreshToken = payload.refresh_token;
    } catch {
      /* ignore, se usa el de entorno */
    }
  }

  if (!refreshToken) {
    return jsonResponse(503, {
      error: "Falta GOOGLE_REFRESH_TOKEN. Completa la conexión con Google Drive desde la app.",
      code: "not_configured",
    });
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json();
    if (!res.ok) {
      return jsonResponse(502, { error: data.error_description || "Google rechazó la solicitud.", code: "google_error" });
    }
    return jsonResponse(200, { access_token: data.access_token, expires_in: data.expires_in });
  } catch (e) {
    return jsonResponse(500, { error: "Error de red al contactar con Google.", code: "network_error" });
  }
}

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
