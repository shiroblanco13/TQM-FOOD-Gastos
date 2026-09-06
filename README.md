# Gastos internos TQM v2

App interna (PWA) para que el personal de TQM Food registre gastos y
kilometraje con foto/PDF de ticket, un administrador los apruebe, y se
exporten a Excel/PDF. Todos los datos y adjuntos se guardan en **Google
Drive**. React 18 + Vite, pensada para desplegarse en Netlify (incluye dos
funciones serverless).

## 1. Crear las credenciales de Google (una sola vez)

1. Ve a <https://console.cloud.google.com/> y crea un proyecto nuevo (o usa
   uno existente).
2. En **APIs y servicios → Biblioteca**, busca "Google Drive API" y
   pulsa **Habilitar**.
3. En **APIs y servicios → Pantalla de consentimiento OAuth**:
   - Tipo de usuario: **Externo** (a menos que uses Google Workspace con
     usuarios internos).
   - Rellena el nombre de la app y tu email.
   - En **Público de prueba / Test users**, añade el email de Google de
     cada persona del equipo que vaya a usar la app (mientras la app no
     esté verificada por Google, solo esos correos podrán autorizarla).
4. En **APIs y servicios → Credenciales → Crear credenciales → ID de
   cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - En "Orígenes de JavaScript autorizados" y "URI de redirección
     autorizados" de momento déjalo vacío o pon `http://localhost:5173` —
     añadiremos la URL real de Netlify más adelante (paso 4 del
     despliegue), porque Google exige que sea exacta.
5. Al crear las credenciales, Google te muestra un **Client ID** y un
   **Client secret**. Guarda los dos.

A diferencia de Dropbox, **Google exige el client secret incluso para
apps sin servidor propio**, así que este proyecto usa dos pequeñas
funciones de Netlify (`google-oauth-exchange` y `google-token`) que lo
guardan del lado servidor y nunca lo exponen al navegador.

## 2. Variables de entorno

Copia `.env.example` a `.env` y rellena:

```
VITE_GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
```

Esta variable **sí** va en el bundle público — es normal y seguro, es el
equivalente a un `client_id` de OAuth. El **client secret nunca va aquí**.

## 3. Instalar y arrancar en local

```bash
npm install
npm run dev
```

Para poder probar en local necesitas que las funciones de Netlify también
corran (usan el client secret). Lo más sencillo es usar la CLI de
Netlify (`npx netlify dev`) en vez de `npm run dev` a secas, y haber
configurado `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` como variables de
entorno locales (`netlify env:set` o un archivo `.env` que también lea
`netlify dev`).

La primera vez que abras la app verás la pantalla **"Configurar Google
Drive"**: solo la completa el superadministrador (`s.alegre`), una única
vez. Al terminar, la app:

- guarda un *refresh token* de prueba en el `localStorage` de ese
  navegador (para poder seguir probando en local), y
- te muestra ese mismo refresh token para copiarlo a Netlify (paso 5).

Justo después, si no existe todavía una carpeta **"Gastos internos TQM"**
en tu Google Drive, la app la crea automáticamente (con las subcarpetas
`tickets`, `facturas` y `exports`) junto con `usuarios.json`, que se
rellena con los 5 usuarios iniciales y contraseñas temporales
**aleatorias** (nunca contraseñas fijas escritas en el código). Esa
pantalla de contraseñas solo se muestra una vez — apúntalas antes de
continuar.

## 4. Desplegar en Netlify

1. Sube este proyecto a un repositorio Git y conéctalo a Netlify. Build
   command: `npm run build`. Publish directory: `dist`. Las funciones en
   `netlify/functions/` se despliegan solas gracias a `netlify.toml`.
2. En **Site settings → Environment variables** añade:
   - `VITE_GOOGLE_CLIENT_ID` — tu Client ID.
   - `GOOGLE_CLIENT_ID` — el mismo Client ID otra vez (lo usan las
     funciones serverless, que no comparten entorno con el build del
     cliente).
   - `GOOGLE_CLIENT_SECRET` — tu Client secret.
3. Despliega el sitio y copia la URL que te da Netlify (algo como
   `https://tu-sitio.netlify.app`).
4. Vuelve a Google Cloud Console → tus credenciales OAuth → añade esa URL
   exacta (con la barra `/` final) en **"URI de redirección
   autorizados"**. Google rechaza la conexión si no coincide
   exactamente.
5. Abre la URL de tu sitio → pantalla **"Configurar Google Drive"** →
   conecta la cuenta → copia el `GOOGLE_REFRESH_TOKEN` que te muestra.
6. Vuelve a Netlify → Environment variables → añade `GOOGLE_REFRESH_TOKEN`
   con ese valor → **Deploys → Trigger deploy** para aplicar el cambio.

A partir de ahí, cualquier persona del equipo que entre en la URL del
sitio tiene acceso, sin repetir la conexión con Google — solo inician
sesión con su usuario y contraseña de la app.

## 5. Instalar como app en iPhone

Abre la URL en Safari → icono de compartir → **Añadir a pantalla de
inicio**. Se instala como PWA a pantalla completa, con icono propio.

## Usuarios iniciales y permisos

| Usuario      | Rol             | Notas                                              |
|--------------|-----------------|-----------------------------------------------------|
| `s.alegre`   | Superadmin      | Protegido: nadie puede borrarlo, desactivarlo ni cambiarle el rol, ni siquiera él mismo. |
| `b.bori`     | Admin           | Gestiona empleados y aprueba gastos, pero no puede borrar usuarios ni tocar a `s.alegre`. |
| `m.marin`, `m.zarioh`, `i.ballesta` | Empleado | Registran sus propios gastos y kilometraje. |

## Estructura en Google Drive

Todo vive dentro de una carpeta llamada **"Gastos internos TQM"** en el
Drive conectado:

```
Gastos internos TQM/
├── usuarios.json     — usuarios, roles, contraseñas (hash), estado
├── gastos.json       — todos los gastos y trayectos de kilometraje
├── config.json       — tarifa por km y ajustes generales
├── exports/          — copia automática de cada Excel/PDF exportado desde "Exportar"
└── 2026/
    ├── agosto/
    │   ├── informe_agosto_2026.pdf      — si se generó un informe mensual
    │   ├── m.marin/                     — fotos de ticket y PDFs de factura
    │   ├── b.bori/                        de m.marin ese mes
    │   └── ...
    └── septiembre/
        └── ...
```

Los adjuntos de cada gasto o trayecto de kilometraje se guardan según la
**fecha del propio gasto** (no la fecha en la que se sube), dentro de
`AÑO/MES/usuario/`. Esas carpetas se crean solas la primera vez que hacen
falta — no hay que crearlas a mano.

La app usa el scope `drive.file` de Google (el más restringido posible):
solo puede ver y modificar los archivos que ella misma ha creado, nunca
el resto de tu Drive.

## Informe mensual

Desde la pestaña **Exportar**, además de las exportaciones filtradas,
hay una sección **"Informe mensual"**: eligiendo mes, año y si se
incluyen solo los aprobados o todos, genera un PDF con el desglose de
gastos y kilometraje por persona (con subtotal de cada una) y el total
del mes. Se descarga en el dispositivo y además se guarda automáticamente
dentro de la carpeta de ese mes en Google Drive (junto a las carpetas de
cada persona), como `informe_<mes>_<año>.pdf`.

## Cómo funciona el OCR

Al adjuntar una foto de ticket aparece el botón **"Extraer importe y
fecha (OCR)"**. Usa `tesseract.js` (reconocimiento en el propio
navegador, sin enviar la imagen a ningún servidor) para leer el texto y
un par de expresiones regulares para adivinar el importe total y la
fecha. Es una ayuda para rellenar más rápido, no un lector infalible —
siempre conviene revisar los datos antes de enviar. La primera vez que
se usa descarga el paquete de idioma español (unos MB), así que requiere
conexión a internet.

## Recuperación de contraseña

No hay servidor de correo configurado, así que el flujo es:

1. La persona pulsa "He olvidado mi contraseña" e indica su usuario.
2. Queda marcada como solicitud pendiente, visible para los
   administradores en la pestaña **Usuarios**.
3. Un admin (o el superadmin) genera una contraseña temporal, se la
   comunica de forma segura (en persona, por chat interno, etc.), y la
   persona la cambia en su primer inicio de sesión.

## ⚠️ Aviso de seguridad importante

Esta es una aplicación **sin servidor propio** (solo un frontend estático
+ dos funciones serverless mínimas). Eso implica límites que conviene
tener claros para un uso interno:

- **El login de la app es una barrera de interfaz, no de acceso a Google
  Drive.** La función `google-token` no comprueba quién hace la
  petición: cualquiera que tenga la URL del sitio podría, técnicamente,
  llamarla directamente y obtener un token de acceso a la cuenta de
  Drive conectada, saltándose el login de usuario/contraseña de la app.
  Para 5 personas y una URL no publicitada el riesgo es bajo, pero si
  quieres una barrera real, activa la **protección por contraseña del
  sitio** en Netlify (planes de pago) o restringe el acceso por IP/VPN.
- **Las contraseñas se verifican en el propio navegador** (con
  PBKDF2-SHA256, nunca en texto plano) porque no hay backend que lo haga
  por ti. Es mucho más seguro que guardarlas en claro, pero no es el
  nivel de un sistema de autenticación de servidor tradicional.
- **Mientras la app de Google no esté verificada**, solo los correos que
  añadas como "Test users" en la pantalla de consentimiento OAuth podrán
  completar la conexión inicial — en la práctica no supone un problema
  porque esa conexión solo la hace el superadministrador una vez, con la
  cuenta de Drive de la empresa.

Para una app interna de expensas con 5 usuarios conocidos es un
compromiso razonable; si en el futuro maneja datos más sensibles, lo
lógico sería añadir un backend real de autenticación.

## Exportaciones

Cada exportación (Excel con `xlsx`, PDF con `jspdf`) se descarga en el
dispositivo **y** se guarda automáticamente una copia en la carpeta
`exports` de Google Drive, con filtros por estado, tipo (gasto/kilometraje)
y empleado.

## Límite conocido de concurrencia

Como no hay base de datos real, todo se guarda en tres archivos JSON de
Google Drive. La app comprueba la fecha de modificación de cada archivo
antes de sobrescribirlo para detectar si dos personas guardan a la vez, y
reintenta automáticamente. Con mucho tráfico simultáneo (no es el caso
esperado con 5 usuarios) podría haber que reintentar una acción.
