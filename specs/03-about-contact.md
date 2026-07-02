# Spec 03 — Acerca de + contacto (Resend)

- **Estado:** implementado
- **Dependencias:** Spec 02 (home landing) — reutiliza Nav y patrón de `app/data`
- **Fecha:** 2026-07-02
- **Objetivo:** Implementar la pantalla "Acerca de" (`/about`) replicando `references/home-about/about.jsx` tal cual (hero + highlights + formulario de contacto), donde el formulario envía el mensaje por correo real usando Resend a través de un Server Action.

## Scope

**Dentro del alcance:**
- Nueva ruta `app/about/page.tsx` con el contenido completo de `references/home-about/about.jsx`:
  - Hero "Acerca de" (kicker, título, texto de misión, `highlight-row` con los 3 highlights e íconos SVG pixel `HighlightIcon`).
  - Divider decorativo animado (`about-divider` con pixels parpadeando).
  - Sección de contacto (`about-contact`): intro + tips, y formulario (`contact-form`) con campos Nombre, Correo, Mensaje.
  - Animación reveal-on-scroll (`useEffect` + `IntersectionObserver`) en las secciones con clase `reveal`, igual patrón que ya usa el home (Spec 02).
- Validación cliente mínima igual al prototipo: si algún campo está vacío, `shake` en el form y no se envía.
- Envío real del formulario vía Server Action (`"use server"`) que llama a la API de Resend desde el servidor.
- Tres estados visuales del resultado de envío:
  - Éxito → pantalla `terminal-success` (idéntica al prototipo, con el nombre del remitente).
  - Error (Resend falla) → variante `terminal` con línea `[FAIL]` y botón para reintentar sin perder lo escrito.
  - Envío en curso → botón de submit en estado disabled/"ENVIANDO…" (no existe en el prototipo original, se agrega porque ahora es una llamada real de red).
- Instalación de la dependencia `resend` (paquete npm oficial).
- Nuevas variables de entorno: `RESEND_API_KEY`, `CONTACT_TO_EMAIL` (default `elmac395@gmail.com`), `CONTACT_FROM_EMAIL` (default `onboarding@resend.dev`), documentadas en `.env.local.example`.
- Actualización de `app/components/Nav.tsx`: agregar link "Acerca de" (→ `/about`) en desktop y panel móvil, igual que en `nav.jsx` del prototipo.
- Migración a `app/globals.css` de las clases CSS específicas de about/contacto que faltan (`.about-*`, `.highlight*`, `.hl-*`, `.about-divider`, `.div-*`, `.contact-*`, `.terminal-success`, `.term-*`) desde `references/home-about/styles.css` (líneas ~1072–1146). `.field` ya existe y se reutiliza.

**Fuera de alcance (no se implementa en este spec):**
- Persistencia de los mensajes de contacto (no se guardan en DB ni en `localStorage`); solo se envían por correo.
- Panel de administración o listado de mensajes recibidos.
- Rate limiting / anti-spam (captcha, honeypot, límite de envíos) — el prototipo no lo tiene y no se pidió.
- Verificación de dominio propio en Resend — se usa el dominio de pruebas `onboarding@resend.dev`.
- Envío de correo de confirmación al remitente (solo se notifica al equipo, vía `CONTACT_TO_EMAIL`).
- Cambios al resto de las pantallas (home, biblioteca, etc.) más allá de agregar el link "Acerca de" al Nav.

## Modelo de datos

No se introduce estado nuevo en `localStorage` ni en `app/data` (esta pantalla no usa mock data). Los tipos nuevos son de servidor, para el envío de correo:

### `app/about/actions.ts` (nuevo — Server Action)

```ts
"use server";

export type ContactFormState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function sendContactMessage(
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState>;
```

- Lee `name`, `email`, `msg` de `formData`.
- Valida server-side que los 3 campos no estén vacíos (defensa además de la validación cliente del `about.jsx` original) — si falta alguno, retorna `{ status: "error", message: "..." }`.
- Llama a `resend.emails.send({ from: process.env.CONTACT_FROM_EMAIL, to: process.env.CONTACT_TO_EMAIL, replyTo: email, subject: ..., text/html: ... })`.
- Si Resend lanza error, retorna `{ status: "error", message: "..." }`.
- Si tiene éxito, no retorna estado propio: el componente cliente interpreta "no error" como éxito y muestra el nombre localmente (igual que el prototipo, que ya guarda `sent` en estado local antes de llamar al server).

### `app/lib/resend.ts` (nuevo)

```ts
export const resend: Resend; // instancia única, `new Resend(process.env.RESEND_API_KEY)`
```

### `.env.local.example` (nuevo, se agrega al repo; `.env.local` real no se versiona)

```
RESEND_API_KEY=
CONTACT_TO_EMAIL=elmac395@gmail.com
CONTACT_FROM_EMAIL=onboarding@resend.dev
```

## Plan de implementación

1. **Instalar dependencia** — `npm install resend`. Crear `.env.local.example` con `RESEND_API_KEY`, `CONTACT_TO_EMAIL=elmac395@gmail.com`, `CONTACT_FROM_EMAIL=onboarding@resend.dev`. Recordar al usuario completar `.env.local` real con su API key antes de probar el envío.
2. **Cliente Resend** — Crear `app/lib/resend.ts` con la instancia única de `Resend` leyendo `process.env.RESEND_API_KEY`.
3. **Server Action** — Crear `app/about/actions.ts` con `sendContactMessage(prevState, formData)`: valida campos, llama a `resend.emails.send(...)` con `to`/`from` desde env vars y `replyTo` = correo del formulario, y retorna `ContactFormState` (`idle` en éxito, `error` con mensaje si falla validación o el envío).
4. **Tema CSS** — Portar a `app/globals.css` las clases `.about-*`, `.highlight*`, `.hl-*`, `.about-divider`, `.div-*`, `.contact-*`, `.terminal-success`, `.term-*` desde `references/home-about/styles.css` (líneas ~1072–1146), siguiendo el mismo patrón de tokens ya usado en Specs 01/02. Agregar también un estado `.term-body .fail` (línea roja `[FAIL]`) para el caso de error, ya que no existe en el prototipo original.
5. **Componente About** (`app/about/page.tsx`) — Client component que replica `about.jsx`:
   - Hero, highlights (`HighlightIcon`), divider — estático, sin cambios respecto al prototipo.
   - `useEffect` + `IntersectionObserver` para `.reveal`, igual patrón que el home.
   - Formulario con `useActionState(sendContactMessage, { status: "idle" })`: mantiene la validación cliente (`shake` si hay campos vacíos) antes de disparar la action; mientras la action corre, el botón muestra "ENVIANDO…" (`pending` de `useActionState`/`useFormStatus`) y queda disabled.
   - Tras un submit exitoso (sin error y la action corrió), muestra `terminal-success` con el nombre ingresado (estado local `sent`, igual que el prototipo).
   - Si `state.status === "error"`, muestra la variante `terminal` con línea `[FAIL]` y el mensaje, con el formulario todavía visible/editable para reintentar (no se pierde lo escrito porque el `<form>` no se desmonta).
6. **Nav actualizado** — En `app/components/Nav.tsx`: agregar `Link` "Acerca de" (→ `/about`, activo cuando `pathname.startsWith("/about")`) después de "Salón de la Fama", en versión desktop y panel móvil.
7. **Verificación** — Con `RESEND_API_KEY` real en `.env.local`, recorrer `/about` en navegador: reveal-on-scroll, validación de campos vacíos (shake), envío exitoso (llega el correo a `CONTACT_TO_EMAIL`, se muestra `terminal-success`), y simular un error (ej. API key inválida temporalmente) para confirmar que se muestra el estado `[FAIL]` sin perder los datos del formulario. Confirmar que el Nav muestra "Acerca de" como activo en `/about`, en desktop y móvil.

Cada paso deja la app compilando y navegable.

## Criterios de aceptación

- [ ] `resend` está agregado a `package.json` (dependencies).
- [ ] `.env.local.example` existe con `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.
- [ ] `/about` renderiza hero, highlights (3, con íconos SVG), divider animado y sección de contacto, visualmente igual a `references/home-about/about.jsx`.
- [ ] Las secciones con clase `reveal` aparecen animadas al hacer scroll, no visibles de entrada.
- [ ] Enviar el formulario con algún campo vacío dispara el `shake` y no ejecuta la Server Action.
- [ ] Enviar el formulario completo con `RESEND_API_KEY` válida envía un correo real a `CONTACT_TO_EMAIL` (verificable recibiéndolo) y muestra la pantalla `terminal-success` con el nombre ingresado.
- [ ] Mientras la Server Action está en curso, el botón de submit queda disabled y muestra "ENVIANDO…".
- [ ] Si la Server Action falla (ej. API key inválida), se muestra el estado `[FAIL]` con mensaje de error y el formulario conserva los datos ingresados para reintentar.
- [ ] `Nav` muestra "Acerca de" (→ `/about`) en desktop y panel móvil, resaltado como activo en `/about`.
- [ ] `npm run build` compila sin errores de tipo ni de lint.

## Decisiones tomadas y descartadas

- **Server Action en vez de Route Handler** — se descartó `app/api/contact/route.ts` porque el App Router de este stack ya usa Server Actions en otros formularios (patrón idiomático), y evita escribir fetch/JSON manual en el cliente.
- **`useActionState` para manejar pending/error** — se descartó manejar el estado de red a mano con `useState` + `try/catch` en el cliente porque `useActionState` es el mecanismo nativo de React 19/Next 16 para Server Actions con estado de resultado, y ya vamos a leer la doc correspondiente en `node_modules/next/dist/docs/` antes de implementar (por AGENTS.md).
- **Estado de error explícito (`[FAIL]`) en vez de fallback silencioso a éxito** — mostrar siempre "éxito" ocultaría fallas reales de configuración (API key, dominio) y el usuario creería que su mensaje llegó cuando no fue así.
- **Dominio de pruebas `onboarding@resend.dev` como remitente por defecto** — se descartó exigir verificación de dominio propio de entrada porque no fue provisto por el usuario; queda como env var configurable si más adelante se verifica un dominio real.
- **Sin persistencia de mensajes (ni DB ni `localStorage`)** — el prototipo no la tenía y no se pidió; agregar un historial de mensajes recibidos es una feature de administración que amerita spec propio si se necesita.
- **Sin rate limiting / anti-spam** — fuera de alcance por no ser parte del prototipo ni haber sido solicitado; queda como riesgo conocido para un spec futuro si el formulario se abre a tráfico público real.

## Riesgos identificados

- **Uso indebido del formulario sin protección anti-spam.** Al no haber rate limiting ni captcha, el endpoint de envío de correo podría ser abusado para spam o para agotar la cuota de Resend. Mitigación mínima futura: rate limit por IP o captcha, fuera de este spec.
- **Costo/límite del plan de Resend.** Si el volumen de mensajes supera el plan gratuito de Resend, los envíos empezarán a fallar; en ese caso el usuario verá el estado `[FAIL]` (comportamiento ya cubierto), pero el equipo debe monitorear la cuenta de Resend.
