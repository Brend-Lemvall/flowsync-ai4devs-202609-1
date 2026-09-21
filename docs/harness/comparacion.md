# Comparación: con harness vs sin harness

**Ticket:** FLOW-10 · Implementar login en el frontend
**Modelo:** Opus 5 (1M context) · **Herramienta:** Claude Code 2.1.278 · **Fecha:** 2026-09-20
**Protocolo:** mismo encargo en las dos copias (skill `/priority-ticket` vs. instrucción a mano),
un solo intento por copia, sin rescatar a la pelada. Solo se comparan los planes; no se aplicó ninguno.

<!--
PENDIENTE (borra este comentario al revisar):
- La columna "Sin harness" está vacía: en esta máquina no hay transcripción de Claude Code para
  flowsync-sin-harness/, así que no hay plan que comparar. Lanza allí el prompt 13 de prompts.md
  y rellena la columna y su bloque de evidencia con el plan literal.
- Ojo con el protocolo: en la copia con harness el plan SÍ se aplicó después ("sí, aplícalo").
  La columna "Con harness" solo cuenta la fase de plan; lo posterior va aparte, en "Notas".
- Las casillas ⚠️ y la Parte B son borrador de Claude a partir de la sesión: son tu criterio,
  revísalas y reescríbelas con tus palabras.
-->

> Este archivo lo escribo yo desde la copia con harness. Las casillas que dependen de mi criterio
> quedan marcadas con ⚠️.

## Parte A: las cuatro casillas

| Casilla | Con harness | Sin harness (pelada) |
|---|---|---|
| **Archivos que propone tocar (contados)** | 6: `frontend/src/vite-env.d.ts`, `frontend/src/api.ts`, `frontend/src/useAuth.ts`, `frontend/src/LoginForm.tsx` (crear); `frontend/src/App.tsx`, `frontend/src/App.css` (editar) | N: `...` |
| **Convenciones que respetó** | `backend/` solo lectura (nombrado en «Archivos que NO se tocan»); sin dependencias nuevas (`fetch` + estado de React); tipos locales que reflejan `user_transformer.ts`, sin `any` (añade `vite-env.d.ts` para no heredar el `any` de `import.meta.env`); `PascalCase.tsx` / `useAuth.ts`; estilo Prettier; reglas de validación copiadas de `validators/user.ts` (no aplica `minLength(8)` en login); cita la clave FLOW-10; marca cada suposición como `SUPUESTO:`; termina en «Plan listo. ¿Lo aplico?» | |
| **Convenciones que NO respetó** | En la fase de plan, ninguna que haya visto. Se salió del procedimiento en un punto: la skill dice «abre el primero» de la JQL y eligió el segundo (FLOW-10), porque el primero era SCRUM-636, de otro proyecto; lo dijo explícitamente | |
| **Veces que tuve que intervenir** | 0 en la fase de plan: un solo `/priority-ticket` y el plan salió completo | N — cuándo y por qué: |
| **Qué arreglaría a mano antes de enseñarlo** ⚠️ | Nada estructural. Recortaría el bloque «Contexto verificado», que es largo. Revisaría un supuesto que después resultó incompleto: validar el email con `type="email"` nativo, que la revisión adversarial marcó como ALTA porque rechaza emails no-ASCII que el backend acepta | |

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
```

</details>

## Parte B: las tres líneas

1. **Hasta qué pieza llegué y cuál costó más de lo esperado:** ⚠️ Llegué a las ocho piezas (commit `7d2b727`: CLAUDE.md, `.mcp.json`, skills `/priority-ticket` y `/commit`, `adversarial-reviewer`, hook de Prettier, reglas de proceso, `AGENTS.md`). Cuál costó más: PENDIENTE, esa parte no ocurrió en esta sesión.
2. **Primera diferencia que vi entre las dos salidas y en qué me fijé para verla:** PENDIENTE: hace falta el plan de la copia sin harness. Un candidato para fijarse: si la pelada detecta el envoltorio `{ data }` o se cree el `{ user, token }` del ticket.
3. **Algo que dejé escrito en el harness y que el agente no cumplió igualmente:** ⚠️ «`backend/` es de solo lectura en tareas de frontend»: para verificar, el agente escribió scripts temporales en `backend/tmp/` y creó un usuario de prueba en la BD local. Ni se versiona ni cambia código del backend, pero lo toca. Además, la propia regla de CLAUDE.md sobre la respuesta del login (`{ user, token }`) era falsa, y el agente la cumplió al revés: siguió al código.

## Notas (fuera del protocolo de planes)

- Después del plan se aplicó en la copia con harness: 6 archivos; `npm run build` y `npm run lint` limpios; los 7 AC probados en el navegador contra el backend real.
- `/commit` pasó tres rondas de `adversarial-reviewer`: 5 hallazgos en la primera (3 arreglados, 2 descartados), un ALTA en la segunda (validación de email no-ASCII, arreglado y contrastado con `vine` real en 40 casos) y dos BAJA en la tercera.
- El `git commit` lo denegó el sistema de permisos dos veces; queda para lanzarlo a mano.
- Intervenciones fuera de la fase de plan: aprobar el plan, borrar `.playwright-mcp/` y `backend/tmp/flow10_check.mjs` (el agente no tenía permiso para borrarlos) y el commit manual.
