# Spec 04 — Integración base de Supabase

- **Estado:** Implementado
- **Dependencias:** ninguna
- **Fecha:** 2026-07-06
- **Objetivo:** Conectar la app a Supabase instalando y configurando los clientes de `@supabase/ssr` (browser y server), sin implementar todavía autenticación, tablas de negocio, Realtime ni Edge Functions.

## Scope

**Dentro del alcance:**
- Instalación de `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, agregadas a `.env.local.example` (valores reales en `.env.local`, no versionado).
- Utilidades de cliente Supabase:
  - `app/lib/supabase/client.ts` — cliente para Client Components (`createBrowserClient`).
  - `app/lib/supabase/server.ts` — cliente para Server Components/Server Actions/Route Handlers (`createServerClient` con cookies de `next/headers`).
- Verificación de que la conexión funciona: una llamada de prueba inofensiva (`supabase.auth.getSession()`) desde un Server Component o Server Action temporal, confirmando que responde sin error de red/configuración (sin depender de auth real ni de tablas).

**Fuera de alcance (no se implementa en este spec):**
- Autenticación (signup, login, logout, sesión de usuario, `/auth`, cambios en `Nav.tsx`) — spec futuro dedicado a auth.
- `proxy.ts` / refresco de sesión — no aplica todavía porque no hay sesión de usuario que refrescar; se agrega junto con el spec de auth.
- Tabla `profiles` u otra tabla de negocio.
- Realtime (subscripciones, replication) — spec futuro, cuando exista una tabla que lo necesite.
- Edge Functions — spec futuro, cuando exista lógica de servidor que las requiera.
- Cualquier dato mock existente (`games.ts`, `leaderboard.ts`, `activity.ts`) no se conecta a Supabase en este spec.

## Modelo de datos

No se introducen tablas nuevas en Supabase (Postgres) en este spec. Los únicos tipos nuevos son de configuración de cliente:

### `app/lib/supabase/client.ts` (nuevo)

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient(): SupabaseClient;
```

### `app/lib/supabase/server.ts` (nuevo)

```ts
import { createServerClient } from "@supabase/ssr";

export async function createClient(): Promise<SupabaseClient>;
```

No se modifica ningún archivo de `app/data` existente.

## Plan de implementación

1. **Instalar dependencias** — `npm install @supabase/supabase-js @supabase/ssr`.
2. **Variables de entorno** — Agregar a `.env.local.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Completar `.env.local` real con los valores del proyecto (`https://rprjaexmsponcvppuqta.supabase.co` y la publishable key correspondiente).
3. **Clientes Supabase** — Crear `app/lib/supabase/client.ts` (browser, `createBrowserClient`) y `app/lib/supabase/server.ts` (server, `createServerClient` con cookies de `next/headers`), siguiendo el patrón oficial de `@supabase/ssr`.
4. **Verificación de conexión** — Crear un punto de prueba temporal (Server Action o Server Component) que instancie el cliente server y llame a `supabase.auth.getSession()`, confirmando que responde sin lanzar error (URL/key correctas). Este punto de prueba se elimina o se reemplaza en el spec de auth, no queda como feature permanente.
5. **Verificación final** — Correr `npm run build` y confirmar que compila. Ejecutar el punto de prueba del paso 4 y confirmar en consola/UI que la llamada a Supabase responde sin error.

Cada paso deja la app compilando y navegable.

## Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` están agregados a `package.json` (dependencies).
- [ ] `.env.local.example` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Existen `app/lib/supabase/client.ts` y `app/lib/supabase/server.ts`.
- [ ] La llamada de prueba (`supabase.auth.getSession()`) desde el server responde sin error de red/configuración, confirmando que la URL y la key están bien configuradas.
- [ ] `npm run build` compila sin errores de tipo ni de lint.

## Decisiones tomadas y descartadas

- **`@supabase/ssr` en vez de `@supabase/supabase-js` a secas** — se necesita el manejo de cookies compatible con Server Components/Actions desde el día uno, aunque este spec no implemente auth todavía; evita reescribir los clientes cuando llegue el spec de auth.
- **Sin `proxy.ts` en este spec** — el `proxy.ts` de Supabase existe para refrescar tokens de sesión; sin autenticación implementada no hay sesión que refrescar, así que agregarlo ahora sería código sin propósito. Se agrega en el spec de auth.
- **Auth queda completamente fuera de este spec** — se separó del pedido original para no mezclar la decisión de "cómo conectar Supabase" con las decisiones de UX de login/signup/logout, que ameritan su propio spec.
- **Verificación vía `getSession()` en vez de una query a una tabla** — no existen tablas todavía; `getSession()` es la llamada más simple que ejercita la configuración real (URL + key) sin depender de datos ni de auth funcional.
- **Realtime y Edge Functions fuera de este spec** — no hay todavía ninguna tabla ni lógica de servidor concreta que los use; se abordan en los specs donde exista una necesidad concreta.
