---
name: commit
description: Único camino permitido para hacer commit en FlowSync. Verifica, pasa la revisión adversarial y commitea con Conventional Commits citando el ticket.
---

# /commit

Argumento opcional: `$ARGUMENTS` = clave del ticket para el trailer.

## Pasos, en orden y sin saltarse ninguno

1. `git status` y `git diff` (staged + unstaged). Si no hay cambios, PARA.
2. Comprueba la rama: si es `main` o `s1/start`, PARA y pide crear una rama `feat/<clave>-<slug>`.
3. Verificación del paquete tocado, pegando la salida completa:
   - `frontend/` tocado → `cd frontend && npm run build && npm run lint`
   - `backend/` tocado → `cd backend && npm run typecheck && npm run lint`
   Si falla, PARA y arregla antes de seguir.
4. Lanza el subagente `adversarial-reviewer` con el diff. Lista sus hallazgos y, para cada uno,
   escribe `ARREGLADO:` o `DESCARTADO porque:`. Si hay alguno de severidad alta sin arreglar, PARA.
5. Revisa que no entren `.env`, `node_modules/`, `tmp/` ni archivos ajenos a la tarea.
6. `git add` solo de los archivos de la tarea (nunca `git add -A` a ciegas).
7. Mensaje en Conventional Commits, minúsculas, imperativo, con scope `frontend`/`backend`/`docs`:
   ```
   <tipo>(<scope>): <resumen en menos de 72 caracteres>

   <qué cambia y por qué, 2-5 líneas>

   Ticket: <CLAVE>
   ```
   Sin `Co-Authored-By` de ningún tipo.
8. Ejecuta el commit y muestra `git log -1 --stat`. **Nunca** hagas `git push` desde esta skill.
