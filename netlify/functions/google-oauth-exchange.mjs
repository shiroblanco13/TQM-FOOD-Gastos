// Se usa SOLO durante la pantalla de configuración inicial (una vez, por el
// superadministrador). A diferencia de Dropbox, Google exige el client_secret
// incluso en el flujo PKCE pensado para apps sin backend — por eso este paso,
// que en la versión de Dropbox se hacía directamente desde el navegador, aquí
// tiene que pasar por esta función para no exponer el secreto en el cliente.
//
// Variables de entorno necesarias en Netlify (Site settings → Environment variables):
//   GOOGLE_CLIENT_ID      (la misma que VITE_GOOGLE_CLIENT_ID)
//   GOOGLE_CLIENT_SECRET  (de la pantalla de credenciales de Google Cloud Console)

export default async function handler(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return jsonResponse(503, {
      error: "Faltan GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET en las variables de entorno de Netlify.",
      code: "not_configured",
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Petición inválida." });
  }

  const { code, code_verifier, redirect_uri } = payload || {};
  if (!code || !code_verifier || !redirect_uri) {
    return jsonResponse(400, { error: "Faltan datos para completar la conexión." });
  }

  const body = new URLSearchParams({
    code,
    code_verifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri,
    grant_type: "authorization_code",
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
    if (!data.refresh_token) {
      return jsonResponse(502, {
        error: "Google no devolvió un refresh token. Vuelve a intentar la conexión (asegúrate de que sea la primera vez, o revoca el acceso previo de la app en myaccount.google.com/permissions y vuelve a intentarlo).",
        code: "no_refresh_token",
      });
    }
    return jsonResponse(200, { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in });
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
