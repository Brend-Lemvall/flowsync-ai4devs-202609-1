---
name: priority-ticket
description: Toma el ticket de Jira de mayor prioridad asignado a mí (o el que se indique como argumento) y produce SOLO un plan de implementación para FlowSync. Nunca escribe código.
---

# /priority-ticket

Argumento opcional: `$ARGUMENTS` = clave del ticket (p. ej. `FLOW-1`). Si no se da, busca el
ticket de mayor prioridad asignado al usuario actual en estado «Por hacer».

## Pasos

1. **Lee el ticket con el MCP de Atlassian.** Usa la búsqueda JQL:
   `assignee = currentUser() AND status = "Por hacer" ORDER BY priority DESC, created ASC`
   y abre el primero (o el de `$ARGUMENTS`). Cita clave, título y el texto completo del ticket
   al inicio de tu respuesta. Si el MCP no responde, PARA y dilo: no sigas de memoria.
2. **Lee el código antes de planear.** Como mínimo: `CLAUDE.md`, `backend/start/routes.ts`,
   `backend/app/validators/user.ts`, `backend/app/transformers/user_transformer.ts`,
   `frontend/src/App.tsx`, `frontend/package.json`. Si el ticket menciona otra cosa, léela también.
3. **Escribe el plan** con exactamente esta estructura:

   ```
   ## Plan — <CLAVE>: <título>

   ### Contexto verificado
   - Endpoint(s) reales que usa la tarea (ruta, método, cuerpo, respuesta) con archivo:línea.
   - Reglas de validación que aplican, copiadas de backend/app/validators/user.ts.

   ### Archivos a tocar (N)
   | # | Archivo | Acción (crear/editar) | Por qué |

   ### Archivos que NO se tocan y por qué
   (obligatorio nombrar backend/ aquí si es tarea de frontend)

   ### Pasos de implementación
   1. ...

   ### Convenciones que aplican
   (cita las de CLAUDE.md que este cambio toca: estilo, tipado, nombres, dependencias)

   ### Verificación
   Comandos exactos que se ejecutarán y qué salida se espera.

   ### Supuestos y dudas
   Cada "SUPUESTO:" explícito. Si algo del ticket contradice el código, señálalo aquí.
   ```

4. **Termina y espera.** No implementes nada, no crees archivos, no ejecutes `npm install`.
   Última línea literal: `Plan listo. ¿Lo aplico?`
