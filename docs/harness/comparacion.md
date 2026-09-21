# Comparación: con harness vs sin harness

**Ticket:** FLOW-10 · Implementar login en el frontend
**Modelo:** Opus 5 (1M context) · **Herramienta:** Claude Code 2.1.278 · **Fecha:** 2026-09-20
**Protocolo:** mismo encargo en las dos copias (skill `/priority-ticket` vs. instrucción a mano),
un solo intento por copia, sin rescatar a la pelada. Solo se comparan los planes. El de la copia con harness
se aplicó después, fuera de la comparación (ver «Notas»); el de la pelada no se aplicó.

> La columna «Con harness» se escribió desde la copia con harness y la columna «Sin harness», desde
> la copia pelada, cuando ya existían los dos planes. Las casillas que dependen de mi criterio
> llevan ⚠️.

## Parte A: las cuatro casillas

| Casilla | Con harness | Sin harness (pelada) |
|---|---|---|
| **Archivos que propone tocar (contados)** | 6: `frontend/src/vite-env.d.ts`, `frontend/src/api.ts`, `frontend/src/useAuth.ts`, `frontend/src/LoginForm.tsx` (crear); `frontend/src/App.tsx`, `frontend/src/App.css` (editar) | 5: `frontend/src/lib/api.ts`, `frontend/src/lib/session.ts`, `frontend/src/LoginForm.tsx` (crear); `frontend/src/App.tsx`, `frontend/src/App.css` (editar) |
| **Convenciones que respetó** | `backend/` solo lectura (nombrado en «Archivos que NO se tocan»); sin dependencias nuevas (`fetch` + estado de React); tipos locales que reflejan `user_transformer.ts`, sin `any` (añade `vite-env.d.ts` para no heredar el `any` de `import.meta.env`); `PascalCase.tsx` / `useAuth.ts`; estilo Prettier; reglas de validación copiadas de `validators/user.ts` (no aplica `minLength(8)` en login); cita la clave FLOW-10; marca cada suposición como `SUPUESTO:`; termina en «Plan listo. ¿Lo aplico?» | `backend/` sin tocar (tabla «Archivos que no se tocan»); sin dependencias nuevas (`fetch` + `useState`/`useEffect`); reglas de validación copiadas de `validators/user.ts` (no aplica `minLength(8)` en login); detecta el envoltorio `{ data }` (`api_provider.ts:18`) y el `logout` sin envolver; flags de `tsconfig.app.json` (`import type` por `verbatimModuleSyntax`, sin `enum` ni parameter properties por `erasableSyntaxOnly`); regla `only-export-components` de oxlint (la lógica va a `lib/*.ts`); estilo de `main.tsx` (comillas simples, sin `;`); termina en «Plan listo. ¿Lo aplico?». Sin `CLAUDE.md`, dedujo todas las convenciones de la configuración y lo dijo |
| **Convenciones que NO respetó** | En la fase de plan, ninguna que haya visto. Se salió del procedimiento en un punto: la skill dice «abre el primero» de la JQL y eligió el segundo (FLOW-10), porque el primero era SCRUM-636, de otro proyecto; lo dijo explícitamente | Contiene un error de hecho: afirma que el cliente **tiene** que enviar `Accept: application/json` y que, sin esa cabecera, el AC 4 no se puede cumplir. Es falso, porque `force_json_response_middleware.ts:6` ya la fuerza en todas las peticiones (registrado en `start/kernel.ts:26`). No leyó `app/middleware/`. Deja `VITE_API_URL` con el tipo `any` que da `vite/client` (en esta copia no hay ninguna regla que lo prohíba). No usa el formato `SUPUESTO:` ni habla de revisión ni de `/commit` (en esta copia no existen) |
| **Veces que tuve que intervenir** | 0 en la fase de plan: un solo `/priority-ticket` y el plan salió completo | 0 en la fase de plan: un solo prompt con el ticket pegado y el plan salió completo. Antes hubo un mensaje sin efecto: pegué por error el comando de arranque (`cd ~/flowsync-sin-harness && claude`) |
| **Qué arreglaría a mano antes de enseñarlo** ⚠️ | Nada estructural. Recortaría el bloque «Contexto verificado», que es largo. Revisaría un supuesto que después resultó incompleto: validar el email con `type="email"` nativo, que la revisión adversarial marcó como ALTA porque rechaza emails no-ASCII que el backend acepta | Quitar la afirmación falsa sobre `Accept` (punto 3 del contexto y su mención en «Archivos que no se tocan»). Confirmar el formato del 422, que el propio plan deja sin verificar (supuesto 4). Recortar el contexto, que es largo. Decidir si se tipa `VITE_API_URL` |

Evidencia (pega fragmentos literales de cada plan, no resúmenes):

<details><summary>Plan con harness</summary>

```
## Plan — FLOW-10: Implementar login en el frontend

### Contexto verificado
[...]
- ⚠️ **Todas las respuestas que pasan por `serialize` vienen dentro de `data`:** `backend/providers/api_provider.ts:18` fija `wrap: 'data'`, y ese provider se registra en `adonisrc.ts:55`. El ticket y `CLAUDE.md` dicen que la respuesta es `{ user, token }`, pero el código real devuelve `{ data: { user, token } }`.
[...]

### Archivos a tocar (6)
| # | Archivo | Acción | Por qué |
|---|---|---|---|
| 1 | `frontend/src/vite-env.d.ts` | crear | Tipar `ImportMetaEnv.VITE_API_URL?: string`. Si no, `import.meta.env.VITE_API_URL` llega como `any` desde `vite/client`, y CLAUDE.md dice «nada de `any»`. |
| 2 | `frontend/src/api.ts` | crear | [...] |
| 3 | `frontend/src/useAuth.ts` | crear | [...] |
| 4 | `frontend/src/LoginForm.tsx` | crear | [...] |
| 5 | `frontend/src/App.tsx` | editar | [...] |
| 6 | `frontend/src/App.css` | editar | [...] |

### Archivos que NO se tocan y por qué
- **`backend/` completo.** Es de solo lectura en tareas de frontend (regla 3 de CLAUDE.md), y el ticket lo pone fuera de alcance. El envoltorio `data` se resuelve en el frontend.
[...]

### Supuestos y dudas
- **CONTRADICCIÓN TICKET/CLAUDE.md ↔ CÓDIGO.** Login y profile devuelven la respuesta dentro de `{ data: … }` (`providers/api_provider.ts:18`, `adonisrc.ts:55`), no `{ user, token }` como dicen el ticket y CLAUDE.md. **Implementaré contra el código.** Propongo un ticket `docs:` aparte para corregir CLAUDE.md y la descripción de FLOW-10.
- **INCOHERENCIA DE CONFIG.** CLAUDE.md dice «TypeScript estricto», pero `frontend/tsconfig.app.json` **no** tiene `"strict": true`. No lo toco porque está fuera del alcance. Escribiré el código como si `strict` estuviera activo y propongo activarlo en un ticket aparte.
[...]

Plan listo. ¿Lo aplico?
```

</details>

<details><summary>Plan sin harness</summary>

```
# Plan de implementación: FLOW-10 · Login en el frontend

## 1. Contexto verificado
[...]
**Qué hay en el código y el ticket no dice** (esto cambia la implementación):

1. **Login y profile devuelven la respuesta dentro de `data`.** `ctx.serialize()` usa `ApiSerializer` con `wrap: 'data'` (`backend/providers/api_provider.ts:18`). Las respuestas reales son:
   - login → `{ data: { user, token } }`
   - profile → `{ data: user }`

   El ticket habla de `{ user, token }` a secas, y eso es incorrecto.
2. **Logout no va envuelto en `data`.** Devuelve un objeto literal `{ message: 'Logged out successfully' }` (`access_tokens_controller.ts:25-27`).
3. **Las peticiones tienen que llevar `Accept: application/json`.** `E_INVALID_CREDENTIALS` (status **400**) solo responde `{ errors: [{ message }] }` si el cliente acepta JSON. Si no, como hay sesión, responde con un redirect `back` (`backend/node_modules/@adonisjs/auth/build/errors-eDV8ejO0.js:205-231`). Sin esa cabecera, el criterio 4 no se puede cumplir.
[...]

## 2. Archivos que se tocan (5)

| # | Archivo | Acción | Para qué |
|---|---|---|---|
| 1 | `frontend/src/lib/api.ts` | nuevo | [...] |
| 2 | `frontend/src/lib/session.ts` | nuevo | [...] |
| 3 | `frontend/src/LoginForm.tsx` | nuevo | [...] |
| 4 | `frontend/src/App.tsx` | modificar | [...] |
| 5 | `frontend/src/App.css` | modificar | [...] |

**Dependencias nuevas: ninguna.** [...]
[...]
## 5. Convenciones del proyecto que aplican

No hay `CLAUDE.md`, así que estas convenciones salen de la configuración y del código existente:
[...]
## 7. Supuestos
[...]
4. **Mensaje de error 422**: [...] No lo he verificado en el código fuente, así que el `curl` de la sección 6 lo confirma antes de dar el criterio 4 por cerrado.
[...]

Plan listo. ¿Lo aplico?
```

</details>

## Parte B: las tres líneas

1. **Hasta qué pieza llegué y cuál costó más de lo esperado:** Llegué a las ocho piezas (commit `7d2b727`: CLAUDE.md, `.mcp.json`, skills `/priority-ticket` y `/commit`, `adversarial-reviewer`, hook de Prettier, reglas de proceso, `AGENTS.md`). Cuál costó más: la implementación de los skills, mantener el ritmo de los cambios en los archivos comparados en los dos repositorios.
2. **Primera diferencia que vi entre las dos salidas y en qué me fijé para verla:** ⚠️ Las dos detectan el envoltorio `{ data }` y corrigen el ticket, así que ahí no hay diferencia. La primera diferencia está en el formato de los errores: la de harness cita `force_json_response_middleware.ts:6` y concluye que los errores siempre llegan en JSON. La pelada no leyó `app/middleware/` y afirma que el cliente tiene que mandar `Accept: application/json`, porque si no «el criterio 4 no se puede cumplir». Eso es falso. Me fijé contrastando una a una las citas `archivo:línea` del «Contexto verificado» de los dos planes.
3. **Algo que dejé escrito en el harness y que el agente no cumplió igualmente:** ⚠️ «`backend/` es de solo lectura en tareas de frontend»: para verificar, el agente escribió scripts temporales en `backend/tmp/` y creó un usuario de prueba en la BD local. Ni se versiona ni cambia código del backend, pero lo toca. Además, la propia regla de CLAUDE.md sobre la respuesta del login (`{ user, token }`) era falsa, y el agente la cumplió al revés: siguió al código.

## Notas (fuera del protocolo de planes)

- La columna «Sin harness» y su evidencia se escribieron desde la sesión pelada **después** de leer el plan con harness. El error del `Accept` se detectó al contrastarlo con ese plan, no en la fase de plan. El plan pelado completo, sin corregir, está en `~/plan-sin-harness.md`.
- Después del plan se aplicó en la copia con harness: 6 archivos; `npm run build` y `npm run lint` limpios; los 7 AC probados en el navegador contra el backend real.
- `/commit` pasó tres rondas de `adversarial-reviewer`: 5 hallazgos en la primera (3 arreglados, 2 descartados), un ALTA en la segunda (validación de email no-ASCII, arreglado y contrastado con `vine` real en 40 casos) y dos BAJA en la tercera.
- El `git commit` lo denegó el sistema de permisos dos veces; queda para lanzarlo a mano.
- Intervenciones fuera de la fase de plan: aprobar el plan, borrar `.playwright-mcp/` y `backend/tmp/flow10_check.mjs` (el agente no tenía permiso para borrarlos) y el commit manual.
